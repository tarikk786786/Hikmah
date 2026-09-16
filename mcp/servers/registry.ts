import { MCPServerConfig, MCPToolDefinition } from '../client/types.js';
import { ToolDefinition, ToolResult, ExecutionContext } from '../../tools/registry/types.js';
import { ToolRegistry } from '../../tools/registry/registry.js';
import { RiskLevel } from '../../core/safety/types.js';

export class MCPServerManager {
  private servers: Map<string, MCPServerConfig> = new Map();
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  public registerServer(config: MCPServerConfig): void {
    this.servers.set(config.id, config);
  }

  public listServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  public async syncServerTools(serverId: string, tools: MCPToolDefinition[]): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server || !server.enabled) return;

    for (const mcpTool of tools) {
      // Determine appropriate default risk level
      let risk: RiskLevel = 'LOW';
      const n = mcpTool.name.toLowerCase();
      if (n.includes('write') || n.includes('edit') || n.includes('post') || n.includes('create')) {
        risk = 'MEDIUM';
      } else if (n.includes('exec') || n.includes('shell') || n.includes('delete')) {
        risk = 'HIGH';
      }

      const toolDef: ToolDefinition = {
        name: `mcp_${server.id}_${mcpTool.name}`,
        version: '1.0.0',
        description: `[MCP: ${server.name}] ${mcpTool.description}`,
        risk,
        timeoutMs: 30000,
        enabled: true,
        inputSchema: mcpTool.inputSchema,
        outputSchema: { type: 'object' },
        execute: async (input: Record<string, unknown>, _ctx: ExecutionContext): Promise<ToolResult> => {
          const start = Date.now();
          // MCP dispatch simulation / HTTP POST adapter
          return {
            success: true,
            data: {
              server: server.name,
              mcpTool: mcpTool.name,
              receivedArguments: input,
              status: 'executed'
            },
            executionTimeMs: Date.now() - start
          };
        }
      };

      this.toolRegistry.registerTool(toolDef);
    }
  }
}
