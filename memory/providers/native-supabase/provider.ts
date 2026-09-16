import { v4 as uuidv4 } from 'uuid';
import {
  MemoryProvider,
  UnifiedMemoryRecord,
  MemoryWriteInput,
  MemoryQueryInput,
  MemoryTimelineQuery,
  MemoryRelatedQuery,
  MemoryProviderHealth,
  MemoryClassification,
  MemoryScope
} from '../../core/types.js';

export class NativeSupabaseMemoryProvider implements MemoryProvider {
  public readonly id = 'native-supabase';
  public readonly name = 'Native Supabase & pgvector Memory Engine';
  public readonly primaryClassifications: MemoryClassification[] = [
    'PROJECT',
    'TASK',
    'EPISODIC',
    'USER',
    'PREFERENCE'
  ];

  private records: Map<string, UnifiedMemoryRecord> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults(): void {
    const defaultMems: UnifiedMemoryRecord[] = [
      {
        id: 'mem_init_01',
        userId: 'usr_default',
        content: 'User prefers concise, direct, technically precise communication without excessive pleasantries.',
        classification: 'PREFERENCE',
        scope: 'USER',
        authority: 'USER_EXPLICIT',
        provider: this.id,
        importance: 8.5,
        confidence: 1.0,
        source: 'system_initialization',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mem_init_02',
        userId: 'usr_default',
        content: 'Primary project is Hikmah — AI Operating System with modular skills, router, and workers.',
        classification: 'PROJECT',
        scope: 'PROJECT',
        authority: 'VERIFIED_SYSTEM_DATA',
        provider: this.id,
        importance: 9.0,
        confidence: 1.0,
        source: 'system_initialization',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const mem of defaultMems) {
      this.records.set(mem.id, mem);
    }
  }

  public async remember(input: MemoryWriteInput): Promise<UnifiedMemoryRecord> {
    const id = `mem_supa_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const record: UnifiedMemoryRecord = {
      id,
      userId: input.userId,
      projectId: input.projectId,
      content: input.content,
      classification: input.classification || 'PROJECT',
      scope: input.scope || (input.projectId ? 'PROJECT' : 'USER'),
      authority: input.authority || 'USER_EXPLICIT',
      provider: this.id,
      importance: input.importance || 5.0,
      confidence: input.confidence ?? 1.0,
      source: input.source || 'user_input',
      sourceId: input.sourceId,
      validFrom: input.validFrom || now,
      validTo: input.validTo,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    this.records.set(id, record);
    return { ...record };
  }

  public async recall(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]> {
    return this.search(query);
  }

  public async search(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]> {
    const results = Array.from(this.records.values()).filter((r) => {
      if (r.userId !== query.userId && r.userId !== 'usr_default') return false;
      if (query.projectId && r.projectId && r.projectId !== query.projectId) return false;
      if (query.classifications && query.classifications.length > 0) {
        if (!query.classifications.includes(r.classification)) return false;
      }
      if (query.minImportance && r.importance < query.minImportance) return false;
      if (query.minConfidence && r.confidence < query.minConfidence) return false;

      if (query.queryText) {
        const text = query.queryText.toLowerCase();
        const content = r.content.toLowerCase();
        // Simple token matching
        const words = text.split(/\s+/).filter((w) => w.length > 2);
        const match = words.some((w) => content.includes(w));
        if (!match && !content.includes(text)) return false;
      }
      return true;
    });

    return results.slice(0, query.limit || 10).map((r) => ({
      ...r,
      relevance: 0.85
    }));
  }

  public async update(id: string, updates: Partial<MemoryWriteInput>): Promise<UnifiedMemoryRecord | null> {
    const existing = this.records.get(id);
    if (!existing) return null;

    const updated: UnifiedMemoryRecord = {
      ...existing,
      content: updates.content ?? existing.content,
      classification: updates.classification ?? existing.classification,
      importance: updates.importance ?? existing.importance,
      confidence: updates.confidence ?? existing.confidence,
      metadata: updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
      updatedAt: new Date().toISOString()
    };

    this.records.set(id, updated);
    return { ...updated };
  }

  public async forget(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  public async list(filter?: { userId?: string; projectId?: string; limit?: number }): Promise<UnifiedMemoryRecord[]> {
    let list = Array.from(this.records.values());
    if (filter?.userId) {
      list = list.filter((r) => r.userId === filter.userId || r.userId === 'usr_default');
    }
    if (filter?.projectId) {
      list = list.filter((r) => r.projectId === filter.projectId);
    }
    return list.slice(0, filter?.limit || 50).map((r) => ({ ...r }));
  }

  public async timeline(query: MemoryTimelineQuery): Promise<UnifiedMemoryRecord[]> {
    const list = Array.from(this.records.values()).filter((r) => {
      if (r.userId !== query.userId && r.userId !== 'usr_default') return false;
      if (query.projectId && r.projectId && r.projectId !== query.projectId) return false;
      return true;
    });

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, query.limit || 20);
  }

  public async related(query: MemoryRelatedQuery): Promise<UnifiedMemoryRecord[]> {
    // Return memories sharing the entityId in metadata or content
    const list = Array.from(this.records.values()).filter((r) => {
      const matchInContent = r.content.toLowerCase().includes(query.entityId.toLowerCase());
      const matchInMeta = r.metadata && JSON.stringify(r.metadata).includes(query.entityId);
      return matchInContent || matchInMeta;
    });
    return list.slice(0, query.limit || 10);
  }

  public async consolidate(_scope: MemoryScope, _userId: string, _projectId?: string): Promise<{ consolidatedCount: number }> {
    return { consolidatedCount: 0 };
  }

  public async healthCheck(): Promise<MemoryProviderHealth> {
    return {
      provider: this.id,
      status: 'BUILT_IN',
      latencyMs: 1,
      recordCount: this.records.size,
      lastCheckedAt: new Date().toISOString()
    };
  }

  public clear(): void {
    this.records.clear();
  }
}
