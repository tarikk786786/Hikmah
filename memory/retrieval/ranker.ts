import { MemoryRecord, MemoryQuery, ScoredMemory } from '../types.js';
import { cosineSimilarity } from '../semantic/similarity.js';

export interface RankerWeights {
  semantic: number;
  recency: number;
  importance: number;
  projectMatch: number;
}

export class MemoryRanker {
  private weights: RankerWeights;

  constructor(weights?: Partial<RankerWeights>) {
    this.weights = {
      semantic: 0.45,
      recency: 0.20,
      importance: 0.25,
      projectMatch: 0.10,
      ...weights
    };
  }

  public rankMemories(
    memories: MemoryRecord[],
    queryVector: number[] | undefined,
    query: MemoryQuery
  ): ScoredMemory[] {
    const now = Date.now();
    const scored: ScoredMemory[] = [];

    for (const mem of memories) {
      // Filter out expired memories
      if (mem.expires_at && new Date(mem.expires_at).getTime() < now) {
        continue;
      }

      // Filter by requested memory types
      if (query.memoryTypes && query.memoryTypes.length > 0 && !query.memoryTypes.includes(mem.memory_type)) {
        continue;
      }

      // Filter by min importance
      if (query.minImportance && mem.importance < query.minImportance) {
        continue;
      }

      // 1. Semantic Similarity
      let sim = 0;
      if (queryVector && mem.embedding) {
        sim = Math.max(0, cosineSimilarity(queryVector, mem.embedding));
      } else {
        // Keyword substring fallback if no embeddings present
        const qTerms = query.queryText.toLowerCase().split(/\s+/);
        const memText = mem.content.toLowerCase();
        const matches = qTerms.filter(t => t.length > 2 && memText.includes(t));
        sim = qTerms.length > 0 ? matches.length / qTerms.length : 0;
      }

      // 2. Recency Decay (exponential decay half-life = 7 days)
      const memTime = new Date(mem.created_at).getTime();
      const ageInDays = Math.max(0, (now - memTime) / (1000 * 60 * 60 * 24));
      const recency = Math.exp(-0.1 * ageInDays);

      // 3. Normalized Importance (1.0 to 10.0 -> 0.1 to 1.0)
      const importanceNorm = Math.min(1.0, Math.max(0.1, mem.importance / 10.0));

      // 4. Project Scope Match
      const projectScore = (query.projectId && mem.project_id === query.projectId) ? 1.0 : 0.0;

      // Final Multi-factor Score
      const finalScore =
        this.weights.semantic * sim +
        this.weights.recency * recency +
        this.weights.importance * importanceNorm +
        this.weights.projectMatch * projectScore;

      scored.push({
        memory: mem,
        score: finalScore,
        similarity: sim,
        recencyFactor: recency
      });
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const limit = query.limit || 5;
    return scored.slice(0, limit);
  }
}
