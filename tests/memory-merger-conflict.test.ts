import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryMerger } from '../memory/core/merger/merger.js';
import { UnifiedMemoryRecord } from '../memory/core/types.js';

describe('MemoryMerger & Authority Conflict Resolution', () => {
  let merger: MemoryMerger;

  beforeEach(() => {
    merger = new MemoryMerger();
    merger.clearConflicts();
  });

  it('should deduplicate identical content and retain the highest authority record', () => {
    const memInfer: UnifiedMemoryRecord = {
      id: 'mem_inf',
      userId: 'usr_1',
      content: 'Project uses TypeScript',
      classification: 'PROJECT',
      scope: 'PROJECT',
      authority: 'MODEL_INFERENCE', // Rank 7
      provider: 'native-supabase',
      importance: 5,
      confidence: 0.6,
      source: 'llm_guess',
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z'
    };

    const memExplicit: UnifiedMemoryRecord = {
      id: 'mem_exp',
      userId: 'usr_1',
      content: 'Project uses TypeScript', // exact duplicate text
      classification: 'PROJECT',
      scope: 'PROJECT',
      authority: 'USER_EXPLICIT', // Rank 1
      provider: 'mem0',
      importance: 9,
      confidence: 1.0,
      source: 'user_chat',
      createdAt: '2026-09-16T10:05:00Z',
      updatedAt: '2026-09-16T10:05:00Z'
    };

    const deduped = merger.deduplicate([memInfer, memExplicit]);
    expect(deduped.length).toBe(1);
    expect(deduped[0].id).toBe('mem_exp');
    expect(deduped[0].authority).toBe('USER_EXPLICIT');
  });

  it('should resolve contradiction in favor of higher authority and record conflict log', () => {
    const existingDoc: UnifiedMemoryRecord = {
      id: 'mem_doc_old',
      userId: 'usr_1',
      content: 'We use Remix framework for the web dashboard',
      classification: 'PROJECT',
      scope: 'PROJECT',
      authority: 'DOCUMENT', // Rank 5
      provider: 'supermemory',
      importance: 6,
      confidence: 0.8,
      source: 'old_spec.pdf',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z'
    };

    const incomingExplicit: UnifiedMemoryRecord = {
      id: 'mem_user_new',
      userId: 'usr_1',
      content: 'We use Next.js framework for the web dashboard',
      classification: 'PROJECT',
      scope: 'PROJECT',
      authority: 'USER_EXPLICIT', // Rank 1
      provider: 'native-supabase',
      importance: 10,
      confidence: 1.0,
      source: 'operator_statement',
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z'
    };

    const result = merger.detectAndResolveConflicts([existingDoc], incomingExplicit);
    expect(result.conflict).toBeDefined();
    expect(result.conflict?.resolution).toBe('OVERWRITE');
    expect(result.resolved[0].id).toBe('mem_user_new');

    const conflicts = merger.getConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].reason).toContain('supersedes');
  });

  it('should preserve existing higher authority if incoming is lower authority inference', () => {
    const explicitRule: UnifiedMemoryRecord = {
      id: 'mem_rule',
      userId: 'usr_1',
      content: 'I prefer concise answers',
      classification: 'PREFERENCE',
      scope: 'USER',
      authority: 'USER_EXPLICIT', // Rank 1
      provider: 'mem0',
      importance: 9,
      confidence: 1.0,
      source: 'user',
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z'
    };

    const weakInference: UnifiedMemoryRecord = {
      id: 'mem_guess',
      userId: 'usr_1',
      content: 'I dislike concise answers', // Contradiction
      classification: 'PREFERENCE',
      scope: 'USER',
      authority: 'MODEL_INFERENCE', // Rank 7
      provider: 'native-supabase',
      importance: 3,
      confidence: 0.4,
      source: 'inference_bot',
      createdAt: '2026-09-16T10:10:00Z',
      updatedAt: '2026-09-16T10:10:00Z'
    };

    const result = merger.detectAndResolveConflicts([explicitRule], weakInference);
    expect(result.conflict?.resolution).toBe('PRESERVE_EXISTING');
    expect(result.resolved[0].id).toBe('mem_rule');
  });
});
