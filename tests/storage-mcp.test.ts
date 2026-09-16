import { describe, it, expect } from 'vitest';
import { StorageMCPServer } from '../mcp/servers/storage/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

describe('PRD 10: Storage MCP Server & Tool Registration', () => {
  const toolRegistry = ToolRegistry.getInstance();
  const capabilityRegistry = CapabilityRegistry.getInstance();
  new StorageMCPServer(undefined, undefined, toolRegistry, capabilityRegistry);

  const EXPECTED_TOOLS = [
    'storage_put',
    'storage_get',
    'storage_delete',
    'storage_list',
    'storage_search',
    'storage_copy',
    'storage_move',
    'storage_share',
    'storage_revoke_share',
    'storage_verify',
    'storage_backup',
    'storage_restore'
  ];

  it('should register all 12 storage tools in ToolRegistry', () => {
    for (const toolName of EXPECTED_TOOLS) {
      const tool = toolRegistry.getTool(toolName);
      expect(tool).toBeDefined();
      expect(tool?.name).toBe(toolName);
      expect(tool?.enabled).toBe(true);
    }
  });

  it('should register all 12 storage capabilities in CapabilityRegistry', () => {
    for (const toolName of EXPECTED_TOOLS) {
      const cap = capabilityRegistry.get(`cap_${toolName}`);
      expect(cap).toBeDefined();
      expect(cap?.category).toBe('storage');
      expect(cap?.type).toBe('STORAGE_PROVIDER');
    }
  });

  it('should execute storage_put and storage_get via ToolRegistry', async () => {
    const key = `mcp_test/note_${Date.now()}.txt`;
    const payload = 'Content stored through MCP ToolRegistry execution';

    const putRes = await toolRegistry.executeTool(
      'storage_put',
      { key, data: payload, tier: 'NORMAL' },
      { requestId: 'req_1', userId: 'usr_mcp_test' }
    );

    expect(putRes.success).toBe(true);
    const obj = putRes.data as { key: string; id: string };
    expect(obj.key).toBe(key);

    const getRes = await toolRegistry.executeTool(
      'storage_get',
      { keyOrId: key, encoding: 'utf-8' },
      { requestId: 'req_2', userId: 'usr_mcp_test' }
    );

    expect(getRes.success).toBe(true);
    const retrieved = getRes.data as { content: string };
    expect(retrieved.content).toBe(payload);
  });

  it('should execute storage_verify and storage_backup via ToolRegistry', async () => {
    const key = `mcp_test/verify_${Date.now()}.txt`;
    await toolRegistry.executeTool('storage_put', { key, data: 'Integrity Payload' }, { requestId: 'req_3' });

    const verifyRes = await toolRegistry.executeTool('storage_verify', { keyOrId: key }, { requestId: 'req_4' });
    expect(verifyRes.success).toBe(true);

    const backupRes = await toolRegistry.executeTool(
      'storage_backup',
      { type: 'DATABASE', name: 'MCP_Automated_Backup' },
      { requestId: 'req_5' }
    );
    expect(backupRes.success).toBe(true);
  });
});
