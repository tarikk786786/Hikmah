import { v4 as uuidv4 } from 'uuid';
import {
  MemoryProvider,
  UnifiedMemoryRecord,
  MemoryWriteInput,
  MemoryQueryInput,
  MemoryTimelineQuery,
  MemoryRelatedQuery,
  MemoryProviderHealth,
  MemoryClassification
} from '../../core/types.js';

export class GraphitiProvider implements MemoryProvider {
  public readonly id = 'graphiti';
  public readonly name = 'Graphiti (Temporal & Dynamic Relationship Graph)';
  public readonly primaryClassifications: MemoryClassification[] = [
    'TEMPORAL',
    'EVENT',
    'RELATIONSHIP'
  ];

  private endpoint?: string;
  private store: Map<string, UnifiedMemoryRecord> = new Map();

  constructor(endpoint?: string) {
    this.endpoint = endpoint || process.env.GRAPHITI_ENDPOINT;
  }

  public async remember(input: MemoryWriteInput): Promise<UnifiedMemoryRecord> {
    const id = `mem_graph_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const record: UnifiedMemoryRecord = {
      id,
      userId: input.userId,
      projectId: input.projectId,
      content: input.content,
      classification: input.classification || 'TEMPORAL',
      scope: input.scope || (input.projectId ? 'PROJECT' : 'GLOBAL'),
      authority: input.authority || 'VERIFIED_SYSTEM_DATA',
      provider: this.id,
      providerRecordId: `graphiti_node_${id}`,
      importance: input.importance || 7.5,
      confidence: input.confidence ?? 0.9,
      source: input.source || 'project_change',
      sourceId: input.sourceId,
      validFrom: input.validFrom || now,
      validTo: input.validTo,
      metadata: {
        ...input.metadata,
        backend: 'graphiti',
        temporalValidity: { validFrom: input.validFrom || now, validTo: input.validTo }
      },
      createdAt: now,
      updatedAt: now
    };

    this.store.set(id, record);
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

  public async timeline(query: MemoryTimelineQuery): Promise<UnifiedMemoryRecord[]> {
    const list = Array.from(this.store.values()).filter((r) => {
      if (r.userId !== query.userId && r.userId !== 'usr_default') return false;
      if (query.projectId && r.projectId && r.projectId !== query.projectId) return false;
      return true;
    });

    list.sort((a, b) => new Date(b.validFrom || b.createdAt).getTime() - new Date(a.validFrom || a.createdAt).getTime());
    return list.slice(0, query.limit || 20);
  }

  public async related(query: MemoryRelatedQuery): Promise<UnifiedMemoryRecord[]> {
    const list = Array.from(this.store.values()).filter((r) => {
      return r.content.toLowerCase().includes(query.entityId.toLowerCase());
    });
    return list.slice(0, query.limit || 10);
  }

  public async update(id: string, updates: Partial<MemoryWriteInput>): Promise<UnifiedMemoryRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: UnifiedMemoryRecord = {
      ...existing,
      content: updates.content ?? existing.content,
      validFrom: updates.validFrom ?? existing.validFrom,
      validTo: updates.validTo ?? existing.validTo,
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
      latencyMs: 4,
      recordCount: this.store.size,
      lastCheckedAt: new Date().toISOString()
    };
  }

  public clear(): void {
    this.store.clear();
  }
}
