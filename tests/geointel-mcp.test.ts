import { describe, it, expect, beforeEach } from 'vitest';
import { GeointelMCPServer } from '../mcp/servers/geointel/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';
import { ConsentManager } from '../core/geointel/consent.js';
import { QuotaTracker } from '../core/geointel/quota-tracker.js';

describe('GeointelMCPServer & Tool Execution', () => {
  let toolRegistry: ToolRegistry;
  let capabilityRegistry: CapabilityRegistry;
  let server: GeointelMCPServer;
  let consentManager: ConsentManager;

  const mockCtx = {
    userId: 'usr_operator',
    conversationId: 'conv_test',
    requestId: 'req_test'
  };

  beforeEach(() => {
    toolRegistry = ToolRegistry.getInstance();
    capabilityRegistry = CapabilityRegistry.getInstance();
    consentManager = ConsentManager.getInstance();
    consentManager.clear();
    QuotaTracker.getInstance().clearDailyUsage();

    server = new GeointelMCPServer(toolRegistry, capabilityRegistry);
  });

  it('should register geointel tools into ToolRegistry', () => {
    const tools = toolRegistry.listTools();
    const names = tools.map((t) => t.name);

    expect(names).toContain('geointel_cell_lookup');
    expect(names).toContain('geointel_cell_search_area');
    expect(names).toContain('geointel_locate_from_cell');
    expect(names).toContain('geointel_reverse_geocode');
    expect(names).toContain('geointel_register_device_consent');
    expect(names).toContain('geointel_revoke_device_consent');
    expect(names).toContain('geointel_verify_device_consent');
    expect(names).toContain('geointel_list_consented_devices');
    expect(names).toContain('geointel_purge_device_data');
    expect(names).toContain('geointel_ingest_observations');
    expect(names).toContain('geointel_analyze_movement');
    expect(names).toContain('geointel_check_provider_quota');
  });

  it('should register geointel capabilities into CapabilityRegistry', () => {
    const caps = capabilityRegistry.list();
    const capIds = caps.map((c) => c.id);

    expect(capIds).toContain('cap_geointel_cell_lookup');
    expect(capIds).toContain('cap_geointel_locate_from_cell');
    expect(capIds).toContain('cap_geointel_register_device_consent');
  });

  it('should execute geointel_cell_lookup and return cell with attribution', async () => {
    const tool = toolRegistry.getTool('geointel_cell_lookup');
    expect(tool).toBeDefined();

    const result = await tool!.execute(
      {
        mcc: 310,
        mnc: 410,
        lac: 1402,
        cellId: 28419,
        radio: 'LTE'
      },
      mockCtx
    );

    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.attribution).toBe('Data from OpenCelliD community (CC-BY-SA 4.0)');
    expect(data.cellId).toBe(28419);
    expect(data.mcc).toBe(310);
  });

  it('should register consent, verify it, and ingest telemetry via MCP tools', async () => {
    // 1. Register consent
    const regTool = toolRegistry.getTool('geointel_register_device_consent');
    expect(regTool).toBeDefined();

    const regResult = await regTool!.execute(
      {
        deviceIdentifier: 'mcp-test-terminal-alpha',
        userId: 'usr_alpha',
        deviceAlias: 'Field Unit 1'
      },
      mockCtx
    );

    expect(regResult.success).toBe(true);
    const hash = (regResult.data as any).deviceIdHash;
    expect(hash).toBeDefined();

    // 2. Verify consent
    const verifyTool = toolRegistry.getTool('geointel_verify_device_consent');
    const verifyResult = await verifyTool!.execute({ deviceIdHash: hash }, mockCtx);
    expect(verifyResult.success).toBe(true);
    expect((verifyResult.data as any).hasConsent).toBe(true);

    // 3. Ingest observations
    const ingestTool = toolRegistry.getTool('geointel_ingest_observations');
    const ingestResult = await ingestTool!.execute(
      {
        deviceIdHash: hash,
        observations: [
          {
            mcc: 310,
            mnc: 410,
            lac: 1402,
            cellId: 28419,
            radio: 'LTE',
            signalStrengthDbm: -72,
            latitude: 37.7749,
            longitude: -122.4194
          }
        ]
      },
      mockCtx
    );

    expect(ingestResult.success).toBe(true);
    expect((ingestResult.data as any).ingestedCount).toBe(1);

    // 4. Check quota tool
    const quotaTool = toolRegistry.getTool('geointel_check_provider_quota');
    const quotaResult = await quotaTool!.execute({ provider: 'opencellid' }, mockCtx);
    expect(quotaResult.success).toBe(true);
    expect((quotaResult.data as any).limit).toBe(1000);

    // 5. Purge tool
    const purgeTool = toolRegistry.getTool('geointel_purge_device_data');
    const purgeResult = await purgeTool!.execute({ deviceIdHash: hash }, mockCtx);
    expect(purgeResult.success).toBe(true);
    expect((purgeResult.data as any).deletedCount).toBe(1);
  });
});
