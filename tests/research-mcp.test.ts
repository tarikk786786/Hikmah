import { describe, it, expect } from 'vitest';
import { ResearchMCPServer } from '../mcp/servers/research/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

describe('PRD 11: Research MCP Server & Tool Registration', () => {
  const toolRegistry = ToolRegistry.getInstance();
  const capabilityRegistry = CapabilityRegistry.getInstance();
  new ResearchMCPServer(undefined, undefined, toolRegistry, capabilityRegistry);

  const EXPECTED_TOOLS = [
    'research_search',
    'research_fetch',
    'research_extract',
    'research_discover',
    'research_start',
    'research_get_status',
    'research_get_report',
    'research_verify_claim',
    'research_build_timeline',
    'research_extract_entities',
    'research_monitor_create',
    'research_monitor_check',
    'research_monitor_list',
    'research_validate_citations',
  ];

  it('should register all 14 research tools in ToolRegistry', () => {
    for (const toolName of EXPECTED_TOOLS) {
      const tool = toolRegistry.getTool(toolName);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe(toolName);
      expect(tool?.enabled).toBe(true);
    }
  });

  it('should register web research capability in CapabilityRegistry', () => {
    const cap = capabilityRegistry.get('cap_web_research_engine');
    expect(cap).toBeDefined();
    expect(cap?.category).toBe('research');
    expect(cap?.type).toBe('MCP_SERVER');
    expect(cap?.tools.length).toBe(14);
  });

  it('should execute research_search and research_extract via ToolRegistry', async () => {
    // Test search
    const searchRes = await toolRegistry.executeTool(
      'research_search',
      { query: 'V8 JavaScript Engine optimization', limit: 2 },
      { requestId: 'req_res_1', userId: 'usr_test' }
    );
    expect(searchRes.success).toBe(true);
    expect((searchRes.data as any).results.length).toBeGreaterThan(0);

    // Test extraction
    const extractRes = await toolRegistry.executeTool(
      'research_extract',
      { html: '<h1>Title</h1><p>Main body paragraph explaining compiler pipelines.</p>' },
      { requestId: 'req_res_2', userId: 'usr_test' }
    );
    expect(extractRes.success).toBe(true);
    expect((extractRes.data as any).extractedText).toContain('Main body paragraph explaining compiler pipelines');
  });

  it('should execute research_verify_claim via ToolRegistry', async () => {
    const verifyRes = await toolRegistry.executeTool(
      'research_verify_claim',
      { claim: 'TypeScript is developed by Microsoft' },
      { requestId: 'req_res_3', userId: 'usr_test' }
    );
    expect(verifyRes.success).toBe(true);
    const claimData = verifyRes.data as any;
    expect(claimData.status).toBeDefined();
    expect(claimData.claim).toBe('TypeScript is developed by Microsoft');
  });
});
