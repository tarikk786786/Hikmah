import { v4 as uuidv4 } from 'uuid';
import {
  MemoryProvider,
  UnifiedMemoryRecord,
  MemoryWriteInput,
  MemoryQueryInput,
  MemoryRelatedQuery,
  MemoryProviderHealth,
  MemoryClassification
} from '../../core/types.js';

export class CogneeProvider implements MemoryProvider {
  public readonly id = 'cognee';
  public readonly name = 'Cognee (Knowledge Graph & Entity Extraction Fabric)';
  public readonly primaryClassifications: MemoryClassification[] = [
    'KNOWLEDGE',
    'ENTITY',
    'RELATIONSHIP'
  ];

  private endpoint?: string;
  private store: Map<string, UnifiedMemoryRecord> = new Map();
  private entityEdges: Map<string, Set<string>> = new Map(); // entity -> relatedEntities

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.COGNEE_ENDPOINT;
  }

  public async remember(input: MemoryWriteInput): Promise<UnifiedMemoryRecord> {
    const id = `mem_cognee_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const record: UnifiedMemoryRecord = {
      id,
      userId: input.userId,
      projectId: input.projectId,
      content: input.content,
      classification: input.classification || 'KNOWLEDGE',
      scope: input.scope || 'PROJECT',
      authority: input.authority || 'PROJECT_SOURCE',
      provider: this.id,
      providerRecordId: `cognee_node_${id}`,
      importance: input.importance || 7.5,
      confidence: input.confidence ?? 0.9,
      source: input.source || 'repository_graph',
      sourceId: input.sourceId,
      metadata: {
        ...input.metadata,
        backend: 'cognee',
        isGraphNode: true
      },
      createdAt: now,
      updatedAt: now
    };

    this.store.set(id, record);

    // Extract simple entity relations
    const tokens = input.content.split(/\s+/).filter((w) => w.length > 3);
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      const b = tokens[i + 1].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (a && b && a !== b) {
        if (!this.entityEdges.has(a)) this.entityEdges.set(a, new Set());
        this.entityEdges.get(a)!.add(b);
      }
    }

    return { ...record };
  }

  public async recall(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]> {
    return this.search(query);
  }

  public async search(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]> {
    const results = Array.from(this.store.values()).filter((r) => {
      if (r.userId !== query.userId && r.userId !== 'usr_default') return false;
      if (query.projectId && r.projectId && r.projectId !== query.projectId) return false;
      if (query.queryText) {
        const text = query.queryText.toLowerCase();
        const content = r.content.toLowerCase();
        const words = text.split(/\s+/).filter((w) => w.length > 2);
        const match = words.some((w) => content.includes(w));
        if (!match && !content.includes(text)) return false;
      }
      return true;
    });

    return results.slice(0, query.limit || 10).map((r) => ({
      ...r,
      relevance: 0.9
    }));
  }

  public async related(query: MemoryRelatedQuery): Promise<UnifiedMemoryRecord[]> {
    const term = query.entityId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const directNeighbors = this.entityEdges.get(term) || new Set();

    const related = Array.from(this.store.values()).filter((r) => {
      const c = r.content.toLowerCase();
      if (c.includes(term)) return true;
      for (const neighbor of directNeighbors) {
        if (c.includes(neighbor)) return true;
      }
      return false;
    });

    return related.slice(0, query.limit || 10).map((r) => ({
      ...r,
      relevance: 0.85
    }));
  }

  public async update(id: string, updates: Partial<MemoryWriteInput>): Promise<UnifiedMemoryRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: UnifiedMemoryRecord = {
      ...existing,
      content: updates.content ?? existing.content,
      metadata: updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
      updatedAt: new Date().toISOString()
    };

    this.store.set(id, updated);
    return { ...updated };
  }

  public async forget(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  public async list(filter?: { userId?: string; projectId?: string; limit?: number }): Promise<UnifiedMemoryRecord[]> {
    let list = Array.from(this.store.values());
    if (filter?.userId) {
      list = list.filter((r) => r.userId === filter.userId || r.userId === 'usr_default');
    }
    if (filter?.projectId) {
      list = list.filter((r) => r.projectId === filter.projectId);
    }
    return list.slice(0, filter?.limit || 50).map((r) => ({ ...r }));
  }

  public async healthCheck(): Promise<MemoryProviderHealth> {
    return {
      provider: this.id,
      status: this.endpoint ? 'CONFIGURED' : 'HEALTHY',
      latencyMs: 5,
      recordCount: this.store.size,
      lastCheckedAt: new Date().toISOString()
    };
  }

  public clear(): void {
    this.store.clear();
    this.entityEdges.clear();
  }
}
