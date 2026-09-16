import { Agent, AgentRun, AgentType } from './types.js';
import { GeneralAgent } from './general/general-agent.js';
import { ResearchAgent } from './research/research-agent.js';
import { DocumentAgent } from './document/document-agent.js';
import { CodingAgent } from './coding/coding-agent.js';
import { BrowserAgent } from './browser/browser-agent.js';
import { SecurityAgent } from './security/security-agent.js';
import { AutomationAgent } from './automation/automation-agent.js';
import { AuditLogger, CorrelationContext } from '../security/audit/logger.js';

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private static instance: AgentRegistry;

  constructor() {
    this.registerAgent(new GeneralAgent());
    this.registerAgent(new ResearchAgent());
    this.registerAgent(new DocumentAgent());
    this.registerAgent(new CodingAgent());
    this.registerAgent(new BrowserAgent());
    this.registerAgent(new SecurityAgent());
    this.registerAgent(new AutomationAgent());
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public registerAgent(agent: Agent): void {
    this.agents.set(agent.type, agent);
    this.agents.set(agent.id, agent);
  }

  public getAgent(typeOrId: string): Agent | undefined {
    return this.agents.get(typeOrId);
  }

  public listAgents(): Agent[] {
    const unique = new Map<string, Agent>();
    for (const a of this.agents.values()) {
      unique.set(a.id, a);
    }
    return Array.from(unique.values());
  }

  // Composable execution: an agent or planner can dispatch to another agent
  public async executeAgent(
    typeOrId: string,
    input: Record<string, unknown>,
    context: { userId: string; correlation: CorrelationContext }
  ): Promise<AgentRun> {
    const agent = this.getAgent(typeOrId);
    if (!agent) {
      throw new Error(`Agent [${typeOrId}] not registered in AgentRegistry`);
    }

    const runId = `run_${agent.type}_${Date.now()}`;
    const run: AgentRun = {
      id: runId,
      agentType: agent.type,
      userId: context.userId,
      status: 'queued',
      input,
      correlation: context.correlation,
      createdAt: new Date().toISOString()
    };

    AuditLogger.log('AGENT_EXECUTION_START', 'LOW', context.correlation, {
      agentId: agent.id,
      agentType: agent.type,
      runId
    });

    const completedRun = await agent.execute(run);

    AuditLogger.log('AGENT_EXECUTION_FINISH', 'LOW', context.correlation, {
      agentId: agent.id,
      status: completedRun.status,
      runId
    });

    return completedRun;
  }
}
