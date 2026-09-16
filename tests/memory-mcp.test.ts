import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryMCPServer } from '../mcp/servers/memory/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';
import { MemoryRouter } from '../memory/core/router/router.js';

describe('MemoryMCPServer & Tool Execution', () => {
  let toolRegistry: ToolRegistry;
  let capabilityRegistry: CapabilityRegistry;
  let router: MemoryRouter;
  let server: MemoryMCPServer;

  const mockCtx = {
    userId: 'usr_operator',
    conversationId: 'conv_memory_test',
    requestId: 'req_memory_test'
  };

  beforeEach(() => {
    toolRegistry = ToolRegistry.getInstance();
    capabilityRegistry = CapabilityRegistry.getInstance();
    router = MemoryRouter.getInstance();
    server = new MemoryMCPServer(router, toolRegistry, capabilityRegistry);
  });

  it('should register all 9 memory tools in ToolRegistry', () => {
    const tools = toolRegistry.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('memory_remember');
    expect(names).toContain('memory_recall');
    expect(names).toContain('memory_search');
    expect(names).toContain('memory_timeline');
    expect(names).toContain('memory_related');
    expect(names).toContain('memory_learn');
    expect(names).toContain('memory_forget');
    expect(names).toContain('memory_consolidate');
    expect(names).toContain('memory_explain');
  });

  it('should register memory capabilities in CapabilityRegistry', () => {
    const caps = capabilityRegistry.list();
    const capIds = caps.map((c) => c.id);

    expect(capIds).toContain('cap_memory_remember');
    expect(capIds).toContain('cap_memory_recall');
    expect(capIds).toContain('cap_memory_learn');
  });

  it('should execute memory_remember, memory_recall, and memory_explain via ToolRegistry', async () => {
    // 1. Remember
    const rememberTool = toolRegistry.getTool('memory_remember');
    expect(rememberTool).toBeDefined();

    const remResult = await rememberTool!.execute(
      {
        content: 'Operator prefers using Vitest for automated testing',
        userId: 'usr_operator'
      },
      mockCtx
    );

    expect(remResult.success).toBe(true);
    const data = remResult.data as any;
    expect(data.id).toBeDefined();
    expect(data.classification).toBe('PREFERENCE');

    // 2. Recall
    const recallTool = toolRegistry.getTool('memory_recall');
    expect(recallTool).toBeDefined();

    const recallResult = await recallTool!.execute(
      {
        queryText: 'Vitest testing preference',
        userId: 'usr_operator'
      },
      mockCtx
    );

    expect(recallResult.success).toBe(true);
    expect((recallResult.data as any).count).toBeGreaterThan(0);

    // 3. Explain
    const explainTool = toolRegistry.getTool('memory_explain');
    const explainResult = await explainTool!.execute({ id: data.id }, mockCtx);
    expect(explainResult.success).toBe(true);
    expect((explainResult.data as any).canonical.primaryProvider).toBe('mem0');

    // 4. Forget
    const forgetTool = toolRegistry.getTool('memory_forget');
    const forgetResult = await forgetTool!.execute({ id: data.id }, mockCtx);
    expect(forgetResult.success).toBe(true);
    expect((forgetResult.data as any).deleted).toBe(true);
  });

  it('should execute memory_learn to record procedural rule', async () => {
    const learnTool = toolRegistry.getTool('memory_learn');
    expect(learnTool).toBeDefined();

    const result = await learnTool!.execute(
      {
        rule: 'Always include file links with file:// scheme',
        userId: 'usr_operator'
      },
      mockCtx
    );

    expect(result.success).toBe(true);
    expect((result.data as any).classification).toBe('PROCEDURAL');
    expect((result.data as any).provider).toBe('langmem');
  });
});
