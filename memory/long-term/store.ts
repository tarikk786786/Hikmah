import { v4 as uuidv4 } from 'uuid';
import { MemoryRecord, MemoryQuery, ScoredMemory } from '../types.js';
import { MemoryRanker } from '../retrieval/ranker.js';
import { ModelRouter } from '../../core/model-router/router.js';

export class MemoryStore {
  private fallbackStore: Map<string, MemoryRecord> = new Map();
  private ranker: MemoryRanker;
  private router: ModelRouter;

  constructor(router?: ModelRouter, ranker?: MemoryRanker) {
    this.router = router || new ModelRouter();
    this.ranker = ranker || new MemoryRanker();
    this.seedDefaultMemories();
  }

  private seedDefaultMemories(): void {
    const defaultMems: MemoryRecord[] = [
      {
        id: 'mem_init_01',
        user_id: 'usr_default',
        content: 'User prefers concise, direct, technically precise communication without excessive pleasantries.',
        memory_type: 'preference_memory',
        importance: 8.5,
        confidence: 1.0,
        source: 'system_initialization',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mem_init_02',
        user_id: 'usr_default',
        content: 'Primary project is HIKMAH — AI Operating System with modular skills and workers.',
        memory_type: 'project_memory',
        importance: 9.0,
        confidence: 1.0,
        source: 'system_initialization',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const mem of defaultMems) {
      this.fallbackStore.set(mem.id, mem);
    }
  }

  public async storeMemory(
    record: Omit<MemoryRecord, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MemoryRecord> {
    const id = `mem_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    let embedding = record.embedding;
    if (!embedding) {
      try {
        const vecs = await this.router.embeddings([record.content]);
        embedding = vecs[0];
      } catch {
        // Continue without embedding if offline
      }
    }

    const completeRecord: MemoryRecord = {
      ...record,
      id,
      embedding,
      created_at: now,
      updated_at: now
    };

    this.fallbackStore.set(id, completeRecord);
    return completeRecord;
  }

  public async retrieveRelevant(query: MemoryQuery): Promise<ScoredMemory[]> {
    let queryVector: number[] | undefined;
    if (query.queryText) {
      try {
        const vecs = await this.router.embeddings([query.queryText]);
        queryVector = vecs[0];
      } catch {
        // Keyword ranking fallback
      }
    }

    const allMemories = Array.from(this.fallbackStore.values()).filter(
      m => m.user_id === query.userId || m.user_id === 'usr_default'
    );

    return this.ranker.rankMemories(allMemories, queryVector, query);
  }

  public async listAll(userId: string): Promise<MemoryRecord[]> {
    return Array.from(this.fallbackStore.values()).filter(
      m => m.user_id === userId || m.user_id === 'usr_default'
    );
  }

  public async deleteMemory(id: string): Promise<boolean> {
    return this.fallbackStore.delete(id);
  }
}
