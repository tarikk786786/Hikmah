import { ToolDefinition, ToolResult, ExecutionContext } from '../registry/types.js';

export const SystemStatusTool: ToolDefinition = {
  name: 'system_status',
  version: '1.0.0',
  description: 'Inspect HIKMAH real-time operational status, memory metrics, queue readiness, and safety flags',
  risk: 'LOW',
  timeoutMs: 3000,
  enabled: true,
  inputSchema: {
    type: 'object',
    properties: {}
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      uptimeSeconds: { type: 'number' },
      memoryUsageMb: { type: 'number' },
      nodeVersion: { type: 'string' },
      killSwitchActive: { type: 'boolean' }
    }
  },
  async execute(_input: Record<string, unknown>, _ctx: ExecutionContext): Promise<ToolResult> {
    const start = Date.now();
    const mem = process.memoryUsage();

    return {
      success: true,
      data: {
        status: 'ONLINE',
        mode: 'AI Operating System Foundation (Phase 1)',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(mem.rss / (1024 * 1024)),
        nodeVersion: process.version,
        killSwitchActive: process.env.JARVIS_KILL_SWITCH === 'true',
        environment: process.env.NODE_ENV || 'development'
      },
      executionTimeMs: Date.now() - start
    };
  }
};
