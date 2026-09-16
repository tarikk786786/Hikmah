import { createHash } from 'crypto';
import { UnifiedMemoryRecord, MemoryAuthority } from '../types.js';

export interface MemoryConflictRecord {
  id: string;
  existingRecord: UnifiedMemoryRecord;
  incomingRecord: UnifiedMemoryRecord;
  resolution: 'OVERWRITE' | 'PRESERVE_EXISTING' | 'COEXIST_TEMPORAL';
  reason: string;
  timestamp: string;
}

export class MemoryMerger {
  private static instance: MemoryMerger;
  private conflicts: MemoryConflictRecord[] = [];

  private authorityRank: Record<MemoryAuthority, number> = {
    USER_EXPLICIT: 1,        // Highest priority
    VERIFIED_SYSTEM_DATA: 2,
    VERIFIED_TOOL_RESULT: 3,
    PROJECT_SOURCE: 4,
    DOCUMENT: 5,
    WEB: 6,
    MODEL_INFERENCE: 7       // Lowest priority
  };

  public static getInstance(): MemoryMerger {
    if (!MemoryMerger.instance) {
      MemoryMerger.instance = new MemoryMerger();
    }
    return MemoryMerger.instance;
  }

  public generateContentHash(content: string): string {
    const normalized = content.trim().toLowerCase().replace(/\s+/g, ' ');
    return createHash('sha256').update(normalized).digest('hex');
  }

  public deduplicate(memories: UnifiedMemoryRecord[]): UnifiedMemoryRecord[] {
    const mapByHash = new Map<string, UnifiedMemoryRecord>();

    for (const mem of memories) {
      const hash = this.generateContentHash(mem.content);
      const existing = mapByHash.get(hash);

      if (!existing) {
        mapByHash.set(hash, mem);
      } else {
        // Retain the memory with higher authority (lower rank number)
        const existingRank = this.authorityRank[existing.authority] || 99;
        const currentRank = this.authorityRank[mem.authority] || 99;

        if (currentRank < existingRank) {
          mapByHash.set(hash, mem);
        } else if (currentRank === existingRank && mem.confidence > existing.confidence) {
          mapByHash.set(hash, mem);
        }
      }
    }

    return Array.from(mapByHash.values());
  }

  public detectAndResolveConflicts(
    existing: UnifiedMemoryRecord[],
    incoming: UnifiedMemoryRecord
  ): { resolved: UnifiedMemoryRecord[]; conflict?: MemoryConflictRecord } {
    const incomingRank = this.authorityRank[incoming.authority] || 99;

    // Check for direct contradiction or same topic overlap
    for (let i = 0; i < existing.length; i++) {
      const item = existing[i];
      const sameTopic = item.classification === incoming.classification && item.userId === incoming.userId;

      if (sameTopic && this.isContradiction(item.content, incoming.content)) {
        const itemRank = this.authorityRank[item.authority] || 99;

        // If incoming has higher authority, replace it
        if (incomingRank < itemRank) {
          const conflict: MemoryConflictRecord = {
            id: `conf_${Date.now()}`,
            existingRecord: item,
            incomingRecord: incoming,
            resolution: 'OVERWRITE',
            reason: `Incoming record authority [${incoming.authority}] supersedes existing [${item.authority}]`,
            timestamp: new Date().toISOString()
          };
          this.conflicts.push(conflict);
          const updated = [...existing];
          updated[i] = incoming;
          return { resolved: updated, conflict };
        } else {
          // Keep existing, record conflict
          const conflict: MemoryConflictRecord = {
            id: `conf_${Date.now()}`,
            existingRecord: item,
            incomingRecord: incoming,
            resolution: 'PRESERVE_EXISTING',
            reason: `Existing record authority [${item.authority}] holds precedence over incoming [${incoming.authority}]`,
            timestamp: new Date().toISOString()
          };
          this.conflicts.push(conflict);
          return { resolved: existing, conflict };
        }
      }
    }

    return { resolved: [...existing, incoming] };
  }

  private isContradiction(textA: string, textB: string): boolean {
    const a = textA.toLowerCase();
    const b = textB.toLowerCase();

    // Check negation / opposing patterns bidirectionally
    if (
      (a.includes('prefer') && b.includes('dislike')) ||
      (b.includes('prefer') && a.includes('dislike'))
    ) return true;

    if (
      (a.includes('use next.js') && b.includes('use remix')) ||
      (b.includes('use next.js') && a.includes('use remix'))
    ) return true;

    if (
      (a.includes('enabled') && b.includes('disabled')) ||
      (b.includes('enabled') && a.includes('disabled'))
    ) return true;

    return false;
  }


  public rankAndSelect(
    memories: UnifiedMemoryRecord[],
    limit = 10
  ): UnifiedMemoryRecord[] {
    const deduped = this.deduplicate(memories);

    const scored = deduped.map((m) => {
      const authWeight = 1 / (this.authorityRank[m.authority] || 7);
      const score =
        (m.relevance ?? 0.7) * 0.4 +
        (m.importance / 10) * 0.3 +
        m.confidence * 0.2 +
        authWeight * 0.1;
      return { memory: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.memory);
  }

  public getConflicts(): MemoryConflictRecord[] {
    return [...this.conflicts];
  }

  public clearConflicts(): void {
    this.conflicts = [];
  }
}
