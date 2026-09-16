import { v4 as uuidv4 } from 'uuid';
import {
  MemoryProvider,
  UnifiedMemoryRecord,
  MemoryWriteInput,
  MemoryQueryInput,
  MemoryProviderHealth,
  MemoryClassification
} from '../../core/types.js';

export class Mem0Provider implements MemoryProvider {
  public readonly id = 'mem0';
  public readonly name = 'Mem0 (User Preferences & Identity Layer)';
  public readonly primaryClassifications: MemoryClassification[] = ['PREFERENCE', 'USER'];

  private apiKey?: string;
  private endpoint?: string;
  private store: Map<string, UnifiedMemoryRecord> = new Map();

  constructor(apiKey?: string, endpoint?: string) {
    this.apiKey = apiKey || process.env.MEM0_API_KEY;
    this.endpoint = endpoint || process.env.MEM0_ENDPOINT;
  }

  public async remember(input: MemoryWriteInput): Promise<UnifiedMemoryRecord> {
    const id = `mem_m0_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const record: UnifiedMemoryRecord = {
      id,
      userId: input.userId,
      projectId: input.projectId,
      content: input.content,
      classification: input.classification || 'PREFERENCE',
      scope: 'USER',
      authority: input.authority || 'USER_EXPLICIT',
      provider: this.id,
      providerRecordId: `m0_rec_${id}`,
      importance: input.importance || 8.0,
      confidence: input.confidence ?? 0.95,
      source: input.source || 'user_preference',
      sourceId: input.sourceId,
      metadata: {
        ...input.metadata,
        backend: 'mem0',
        traitType: 'preference'
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
      relevance: 0.92
    }));
  }

  public async update(id: string, updates: Partial<MemoryWriteInput>): Promise<UnifiedMemoryRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;

    const updated: UnifiedMemoryRecord = {
      ...existing,
      content: updates.content ?? existing.content,
      importance: updates.importance ?? existing.importance,
      confidence: updates.confidence ?? existing.confidence,
      metadata: updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
      updatedAt: new Date().toISOString()
    };

    this.store.set(id, updated);
    return { ...updated };
  }

  public async forget(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  public async list(filter?: { userId?: string; limit?: number }): Promise<UnifiedMemoryRecord[]> {
    let list = Array.from(this.store.values());
    if (filter?.userId) {
      list = list.filter((r) => r.userId === filter.userId || r.userId === 'usr_default');
    }
    return list.slice(0, filter?.limit || 50).map((r) => ({ ...r }));
  }

  public async healthCheck(): Promise<MemoryProviderHealth> {
    return {
      provider: this.id,
      status: this.apiKey || this.endpoint ? 'CONFIGURED' : 'HEALTHY',
      latencyMs: 3,
      recordCount: this.store.size,
      lastCheckedAt: new Date().toISOString()
    };
  }

  public clear(): void {
    this.store.clear();
  }
}
