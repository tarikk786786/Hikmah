import { describe, it, expect } from 'vitest';
import { BrowserMCPServer } from '../mcp/servers/browser/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

describe('PRD 12: Browser MCP Server & Tool Registration', () => {
  const toolRegistry = ToolRegistry.getInstance();
  const capabilityRegistry = CapabilityRegistry.getInstance();
  new BrowserMCPServer(undefined, toolRegistry, capabilityRegistry);

  const EXPECTED_TOOLS = [
    'browser_navigate',
    'browser_click',
    'browser_type',
    'browser_fill_form',
    'browser_select',
    'browser_scroll',
    'browser_wait',
    'browser_screenshot',
    'browser_snapshot_dom',
    'browser_extract_accessibility',
    'browser_act_semantic',
    'browser_extract_semantic',
    'browser_observe',
    'browser_session_create',
    'browser_session_close',
    'browser_run_agent',
  ];

  it('should register all 16 browser tools in ToolRegistry', () => {
    for (const toolName of EXPECTED_TOOLS) {
      const tool = toolRegistry.getTool(toolName);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe(toolName);
      expect(tool?.enabled).toBe(true);
    }
  });

  it('should register browser intelligence capability in CapabilityRegistry', () => {
    const cap = capabilityRegistry.get('cap_browser_intelligence_engine');
    expect(cap).toBeDefined();
    expect(cap?.category).toBe('browser');
    expect(cap?.type).toBe('BROWSER_PROVIDER');
    expect(cap?.tools.length).toBe(16);
  });

  it('should execute session lifecycle and navigation tools via ToolRegistry', async () => {
    // 1. Create session
    const createRes = await toolRegistry.executeTool(
      'browser_session_create',
      {},
      { requestId: 'req_b1', userId: 'usr_test' }
    );
    expect(createRes.success).toBe(true);
    const session = createRes.data as any;
    expect(session.id).toBeDefined();

    // 2. Navigate
    const navRes = await toolRegistry.executeTool(
      'browser_navigate',
      { sessionId: session.id, url: 'about:blank' },
      { requestId: 'req_b2', userId: 'usr_test' }
    );
    expect(navRes.success).toBe(true);

    // 3. Screenshot
    const shotRes = await toolRegistry.executeTool(
      'browser_screenshot',
      { sessionId: session.id },
      { requestId: 'req_b3', userId: 'usr_test' }
    );
    expect(shotRes.success).toBe(true);
    expect((shotRes.data as any).base64).toBeDefined();

    // 4. Snapshot DOM
    const snapRes = await toolRegistry.executeTool(
      'browser_snapshot_dom',
      { sessionId: session.id },
      { requestId: 'req_b4', userId: 'usr_test' }
    );
    expect(snapRes.success).toBe(true);
    expect((snapRes.data as any).title).toBe('Blank Page');

    // 5. Close session
    const closeRes = await toolRegistry.executeTool(
      'browser_session_close',
      { sessionId: session.id },
      { requestId: 'req_b5', userId: 'usr_test' }
    );
    expect(closeRes.success).toBe(true);
  });
});
