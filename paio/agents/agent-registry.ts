import { AIAgent } from '../types/universal';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AIAgent> = new Map();

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public register(agent: AIAgent): void {
    this.agents.set(agent.id, agent);
  }

  public getAgent(id: string): AIAgent | undefined {
    return this.agents.get(id);
  }

  public listAgents(filter?: { maturity?: AIAgent['maturity'], type?: string }): AIAgent[] {
    let res = Array.from(this.agents.values());
    if (filter?.maturity) {
      res = res.filter(a => a.maturity === filter.maturity);
    }
    if (filter?.type) {
      res = res.filter(a => a.type === filter.type);
    }
    return res;
  }
}
