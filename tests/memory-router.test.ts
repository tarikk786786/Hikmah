import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from '../memory/core/router/router.js';

describe('MemoryRouter', () => {
  let router: MemoryRouter;

  beforeEach(() => {
    router = new MemoryRouter();
  });

  it('should list all 7 registered memory providers', () => {
    const providers = router.listProviders();
    const ids = providers.map((p) => p.id);

    expect(ids).toContain('native-supabase');
    expect(ids).toContain('mem0');
    expect(ids).toContain('graphiti');
    expect(ids).toContain('letta');
    expect(ids).toContain('cognee');
    expect(ids).toContain('langmem');
    expect(ids).toContain('supermemory');
  });

  it('should auto-classify and route user preference to mem0', async () => {
    const memory = await router.remember({
      content: 'I prefer concise answers with TypeScript code samples',
      userId: 'usr_alice'
    });

    expect(memory.classification).toBe('PREFERENCE');
    expect(memory.provider).toBe('mem0');
    expect(memory.authority).toBe('USER_EXPLICIT');

    // Retrieve via recall
    const recalled = await router.recall({
      queryText: 'TypeScript preference',
      userId: 'usr_alice'
    });

    expect(recalled.length).toBeGreaterThan(0);
    expect(recalled[0].content).toContain('TypeScript');
  });

  it('should auto-classify and route temporal fact to graphiti', async () => {
    const memory = await router.remember({
      content: 'The database was previously MySQL but migrated to Supabase in PRD 08A',
      userId: 'usr_alice',
      projectId: 'proj_hikmah'
    });

    expect(memory.classification).toBe('TEMPORAL');
    expect(memory.provider).toBe('graphiti');

    // Check timeline query
    const timeline = await router.timeline({
      userId: 'usr_alice',
      projectId: 'proj_hikmah'
    });

    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].content).toContain('migrated to Supabase');
  });

  it('should route procedural rules through router.learn() to langmem', async () => {
    const rule = await router.learn({
      content: 'Always wrap background workers in Docker containers on Render',
      userId: 'usr_alice',
      projectId: 'proj_hikmah'
    });

    expect(rule.classification).toBe('PROCEDURAL');
    expect(rule.provider).toBe('langmem');

    const searchResults = await router.search({
      queryText: 'How to run background workers',
      userId: 'usr_alice',
      projectId: 'proj_hikmah'
    });

    expect(searchResults.length).toBeGreaterThan(0);
  });

  it('should gracefully fall back to native-supabase if specified provider is unknown', async () => {
    const fallbackMem = await router.remember({
      content: 'General note about system architecture',
      userId: 'usr_alice',
      targetProvider: 'non-existent-provider'
    });

    expect(fallbackMem.provider).toBe('native-supabase');
  });

  it('should provide transparent audit explanation via router.explain()', async () => {
    const mem = await router.remember({
      content: 'Hikmah relies on OpenCelliD for cellular queries',
      userId: 'usr_bob',
      projectId: 'proj_geointel'
    });

    const explanation = router.explain(mem.id);
    expect(explanation.found).toBe(true);
    expect(explanation.canonical?.primaryProvider).toBe(mem.provider);
    expect(explanation.canonical?.canonicalHash).toBeDefined();
    expect(explanation.providerDetails?.length).toBeGreaterThan(0);
  });

  it('should permanently forget memories across canonical registry and providers', async () => {
    const mem = await router.remember({
      content: 'Temporary debug memory to be erased',
      userId: 'usr_bob'
    });

    const forgotten = await router.forget(mem.id);
    expect(forgotten).toBe(true);

    const explanation = router.explain(mem.id);
    expect(explanation.found).toBe(false);
  });

  it('should retrieve structured context packet framed for safe consumption', async () => {
    await router.remember({
      content: 'User prefers dark mode UI themes',
      userId: 'usr_context_test'
    });

    await router.remember({
      content: 'Always format dates in ISO 8601',
      userId: 'usr_context_test'
    });

    const contextPacket = await router.retrieve_context({
      queryText: 'preferences and date formatting rules',
      userId: 'usr_context_test'
    });

    expect(contextPacket.formattedContext).toContain('<context_memories');
    expect(contextPacket.formattedContext).toContain('</context_memories>');
  });
});
