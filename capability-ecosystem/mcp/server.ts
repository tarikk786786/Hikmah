import { CapabilityEcosystemEngine } from '../ecosystem-engine.js';

export interface McpToolCallRequest {
  tool: string;
  arguments: Record<string, any>;
}

export interface McpToolCallResponse {
  content: Array<{
    type: 'text' | 'json';
    text?: string;
    json?: any;
  }>;
  isError?: boolean;
}

export class PluginsMcpServer {
  private static instance: PluginsMcpServer;
  private engine: CapabilityEcosystemEngine;

  constructor() {
    this.engine = CapabilityEcosystemEngine.getInstance();
  }

  public static getInstance(): PluginsMcpServer {
    if (!PluginsMcpServer.instance) {
      PluginsMcpServer.instance = new PluginsMcpServer();
    }
    return PluginsMcpServer.instance;
  }

  public getSupportedTools(): Array<{ name: string; description: string; inputSchema: any }> {
    return [
      {
        name: 'plugins.list',
        description: 'List all available and installed integration plugins.',
        inputSchema: {
          type: 'object',
          properties: { onlyInstalled: { type: 'boolean' } },
        },
      },
      {
        name: 'plugins.describe',
        description: 'Inspect full manifest and exposed capabilities of a plugin.',
        inputSchema: {
          type: 'object',
          properties: { pluginId: { type: 'string' } },
          required: ['pluginId'],
        },
      },
      {
        name: 'plugins.install',
        description: 'Install and verify an integration plugin.',
        inputSchema: {
          type: 'object',
          properties: { pluginId: { type: 'string' } },
          required: ['pluginId'],
        },
      },
      {
        name: 'plugins.uninstall',
        description: 'Uninstall a plugin and remove it from plugins.lock.',
        inputSchema: {
          type: 'object',
          properties: { pluginId: { type: 'string' } },
          required: ['pluginId'],
        },
      },
      {
        name: 'providers.list',
        description: 'List registered providers by category.',
        inputSchema: {
          type: 'object',
          properties: { category: { type: 'string' } },
        },
      },
      {
        name: 'providers.select',
        description: 'Select the optimal provider for an operation with health, quota, and preference checks.',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            explicitProviderId: { type: 'string' },
            userPreferredProviderId: { type: 'string' },
          },
          required: ['operation'],
        },
      },
      {
        name: 'providers.explain',
        description: 'Explain routing decision reason, evaluated candidates, and failover status.',
        inputSchema: {
          type: 'object',
          properties: { operation: { type: 'string' } },
          required: ['operation'],
        },
      },
      {
        name: 'providers.health',
        description: 'Check health status, latency, and circuit breaker state of a provider.',
        inputSchema: {
          type: 'object',
          properties: { providerId: { type: 'string' } },
          required: ['providerId'],
        },
      },
      {
        name: 'providers.quota',
        description: 'Check rate limits and daily quota usage for a provider.',
        inputSchema: {
          type: 'object',
          properties: { providerId: { type: 'string' } },
          required: ['providerId'],
        },
      },
      {
        name: 'oauth.status',
        description: 'Check OAuth connection status and active scopes for an account.',
        inputSchema: {
          type: 'object',
          properties: {
            providerId: { type: 'string' },
            accountId: { type: 'string' },
          },
          required: ['providerId', 'accountId'],
        },
      },
      {
        name: 'accounts.list',
        description: 'List connected account identities across providers.',
        inputSchema: {
          type: 'object',
          properties: { providerType: { type: 'string' } },
        },
      },
      {
        name: 'capabilities.execute',
        description: 'Execute a canonical operation via the CapabilityRouter (e.g. email.search, git.get_issue).',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            input: { type: 'object' },
            accountHint: { type: 'string' },
            explicitProviderId: { type: 'string' },
            approved: { type: 'boolean' },
          },
          required: ['operation', 'input'],
        },
      },
    ];
  }

  public async handleToolCall(request: McpToolCallRequest): Promise<McpToolCallResponse> {
    const args = request.arguments || {};

    try {
      switch (request.tool) {
        case 'plugins.list': {
          const list = this.engine.pluginRegistry.listPlugins(Boolean(args.onlyInstalled));
          return { content: [{ type: 'json', json: list }] };
        }

        case 'plugins.describe': {
          const p = this.engine.pluginRegistry.getPlugin(args.pluginId);
          if (!p) return { content: [{ type: 'text', text: `Plugin '${args.pluginId}' not found` }], isError: true };
          return { content: [{ type: 'json', json: p }] };
        }

        case 'plugins.install': {
          const res = await this.engine.installer.install(args.pluginId);
          return { content: [{ type: 'json', json: res }], isError: !res.success };
        }

        case 'plugins.uninstall': {
          const ok = this.engine.installer.uninstall(args.pluginId);
          return { content: [{ type: 'json', json: { success: ok, pluginId: args.pluginId } }] };
        }

        case 'providers.list': {
          const list = this.engine.providerRouter.listProviders(args.category).map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            category: p.category,
          }));
          return { content: [{ type: 'json', json: list }] };
        }

        case 'providers.select':
        case 'providers.explain': {
          const { provider, explanation } = await this.engine.providerRouter.selectProvider(args.operation, {
            explicitProviderId: args.explicitProviderId,
            userPreferredProviderId: args.userPreferredProviderId,
            allowFailover: true,
          });
          return { content: [{ type: 'json', json: { providerId: provider.id, explanation } }] };
        }

        case 'providers.health': {
          const provider = this.engine.providerRouter.getProvider(args.providerId);
          if (!provider) return { content: [{ type: 'text', text: 'Provider not found' }], isError: true };
          const health = await this.engine.healthManager.checkHealth(provider);
          return { content: [{ type: 'json', json: health }] };
        }

        case 'providers.quota': {
          const usage = this.engine.quotaManager.getUsage(args.providerId);
          const limit = this.engine.quotaManager.getLimit(args.providerId);
          return { content: [{ type: 'json', json: { usage, limit } }] };
        }

        case 'oauth.status': {
          const status = this.engine.oauthManager.getConnectionStatus(args.providerId, args.accountId);
          return { content: [{ type: 'json', json: status }] };
        }

        case 'accounts.list': {
          const accounts = this.engine.accountRouter.listAccounts(args.providerType);
          return { content: [{ type: 'json', json: accounts }] };
        }

        case 'capabilities.execute': {
          const result = await this.engine.execute({
            operation: args.operation,
            input: args.input,
            accountHint: args.accountHint,
            explicitProviderId: args.explicitProviderId,
            approved: Boolean(args.approved),
          });
          return { content: [{ type: 'json', json: result }], isError: !result.success };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown MCP tool '${request.tool}' in PluginsMcpServer` }],
            isError: true,
          };
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error executing tool '${request.tool}': ${err.message}` }],
        isError: true,
      };
    }
  }
}
