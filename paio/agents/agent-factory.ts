import crypto from 'crypto';
import { AIAgent } from '../types/universal';
import { AgentRegistry } from './agent-registry';

export class AgentFactory {
  private static instance: AgentFactory;
  private registry = AgentRegistry.getInstance();

  public static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }

  public createAgent(params: {
    name: string;
    description: string;
    type: string;
    capabilities?: string[];
    permissions?: string[];
    owner?: string;
  }): AIAgent {
    const agent: AIAgent = {
      id: `agt_${crypto.randomBytes(6).toString('hex')}`,
      name: params.name,
      description: params.description,
      type: params.type,
      maturity: 'DRAFT',
      capabilities: params.capabilities || [],
      permissions: params.permissions || [],
      owner: params.owner || 'system',
    };

    this.registry.register(agent);
    return agent;
  }
}
