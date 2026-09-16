import { describe, it, expect, beforeEach } from 'vitest';
import { NativeSupabaseMemoryProvider } from '../memory/providers/native-supabase/provider.js';
import { Mem0Provider } from '../memory/providers/mem0/provider.js';
import { GraphitiProvider } from '../memory/providers/graphiti/provider.js';
import { LettaProvider } from '../memory/providers/letta/provider.js';
import { CogneeProvider } from '../memory/providers/cognee/provider.js';
import { LangMemProvider } from '../memory/providers/langmem/provider.js';
import { SupermemoryProvider } from '../memory/providers/supermemory/provider.js';

describe('Specialized Memory Providers', () => {
  it('NativeSupabaseMemoryProvider: should store, recall, and report BUILT_IN health', async () => {
    const provider = new NativeSupabaseMemoryProvider();
    const mem = await provider.remember({
      content: 'Core project record in native Supabase',
      userId: 'usr_supa'
    });

    expect(mem.provider).toBe('native-supabase');
    expect(mem.id).toBeDefined();

    const results = await provider.recall({ queryText: 'native Supabase', userId: 'usr_supa' });
    expect(results.length).toBeGreaterThan(0);

    const health = await provider.healthCheck();
    expect(health.status).toBe('BUILT_IN');
  });

  it('Mem0Provider: should manage user preferences and personality traits', async () => {
    const provider = new Mem0Provider();
    const mem = await provider.remember({
      content: 'User dislikes verbose explanations',
      userId: 'usr_mem0',
      classification: 'PREFERENCE'
    });

    expect(mem.provider).toBe('mem0');
    expect(mem.metadata?.backend).toBe('mem0');

    const search = await provider.search({ queryText: 'verbose explanations', userId: 'usr_mem0' });
    expect(search.length).toBe(1);
  });

  it('GraphitiProvider: should manage temporal validity windows and timelines', async () => {
    const provider = new GraphitiProvider();
    const mem = await provider.remember({
      content: 'Framework upgraded from v1 to v2 on 2026-09-01',
      userId: 'usr_graph',
      validFrom: '2026-09-01T00:00:00Z',
      validTo: '2027-09-01T00:00:00Z'
    });

    expect(mem.provider).toBe('graphiti');
    expect(mem.validFrom).toBe('2026-09-01T00:00:00Z');

    const timeline = await provider.timeline({ userId: 'usr_graph' });
    expect(timeline.length).toBeGreaterThan(0);
  });

  it('LettaProvider: should manage stateful agent working memory checkpoints', async () => {
    const provider = new LettaProvider();
    const mem = await provider.remember({
      content: 'Checkpoint: CodingAgent created PR #42 with test verification',
      userId: 'usr_agent',
      classification: 'AGENT'
    });

    expect(mem.provider).toBe('letta');
    expect(mem.metadata?.memfsBlock).toBe(true);
  });

  it('CogneeProvider: should extract entities and traverse related graph concepts', async () => {
    const provider = new CogneeProvider();
    await provider.remember({
      content: 'Hikmah architecture connects NextJS frontend to Supabase postgres backend',
      userId: 'usr_cognee'
    });

    const related = await provider.related({
      entityId: 'NextJS',
      userId: 'usr_cognee'
    });

    expect(related.length).toBeGreaterThan(0);
    expect(related[0].content).toContain('Hikmah');
  });

  it('LangMemProvider: should persist procedural guidelines and workflow corrections', async () => {
    const provider = new LangMemProvider();
    const mem = await provider.remember({
      content: 'When writing API routes, always validate query params with Zod schemas',
      userId: 'usr_langmem'
    });

    expect(mem.provider).toBe('langmem');
    expect(mem.classification).toBe('PROCEDURAL');
  });

  it('SupermemoryProvider: should manage large document and research chunks', async () => {
    const provider = new SupermemoryProvider();
    const mem = await provider.remember({
      content: 'PDF Documentation: Detailed breakdown of the Model Context Protocol (MCP) spec across 12 pages.',
      userId: 'usr_smem',
      classification: 'DOCUMENT'
    });

    expect(mem.provider).toBe('supermemory');
    expect(mem.classification).toBe('DOCUMENT');
    expect(mem.metadata?.chunkCount).toBeDefined();
  });
});
