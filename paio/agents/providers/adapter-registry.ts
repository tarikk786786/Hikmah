import { IAgentProvider } from '../agent-executor.js';
import { LangGraphAdapter } from './langgraph-adapter.js';
import { OpenHandsAdapter } from './openhands-adapter.js';
import { MCPAdapter } from './mcp-adapter.js';
import { A2AAdapter } from './a2a-adapter.js';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<string, IAgentProvider> = new Map();

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
      // Auto-register default adapters
      AdapterRegistry.instance.register(new LangGraphAdapter());
      AdapterRegistry.instance.register(new OpenHandsAdapter());
      AdapterRegistry.instance.register(new MCPAdapter());
      AdapterRegistry.instance.register(new A2AAdapter());
    }
    return AdapterRegistry.instance;
  }

  public register(adapter: IAgentProvider): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  public getAdapter(providerId: string): IAgentProvider | undefined {
    return this.adapters.get(providerId);
  }

  public async initializeAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.initialize();
    }
  }
}
