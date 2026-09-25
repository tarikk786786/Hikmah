import { AIAgent } from '../../types/universal.js';
import { IAgentProvider, AgentExecutionRequest, AgentExecutionResult } from '../agent-executor.js';
import { A2ABroker } from '../collaboration/a2a-broker.js';

/**
 * Adapter for Agent-to-Agent (A2A) Orchestration
 * Acts as a meta-agent that delegates subtasks to specialized agents and aggregates results.
 */
export class A2AAdapter implements IAgentProvider {
  public providerId = 'a2a';
  private broker = A2ABroker.getInstance();

  async initialize(): Promise<void> {
    console.log('[A2AAdapter] Initializing Canonical Agent-to-Agent Interoperability Broker...');
  }

  async execute(agent: AIAgent, request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    console.log(`[A2AAdapter] Orchestrating cross-agent communication for task ${request.taskId}...`);
    
    // Simulate breaking down the task into two sub-delegations
    // In reality, an LLM call here would determine the sub-agents and payloads.
    
    // Delegation 1: Research Agent
    const msg1 = await this.broker.sendMessage({
      sourceAgentId: agent.id,
      targetAgentId: 'agent_research',
      type: 'DELEGATE',
      payload: `Analyze requirements for: ${request.instructions}`
    });

    console.log(`[A2AAdapter] Waiting for research sub-agent (MsgID: ${msg1.messageId})...`);
    const researchResult = await this.broker.waitForResponse(msg1.messageId, 30000);

    // Delegation 2: Coder Agent
    const msg2 = await this.broker.sendMessage({
      sourceAgentId: agent.id,
      targetAgentId: 'agent_coding',
      type: 'DELEGATE',
      payload: `Implement based on research: ${researchResult.output}`
    });

    console.log(`[A2AAdapter] Waiting for coding sub-agent (MsgID: ${msg2.messageId})...`);
    const codingResult = await this.broker.waitForResponse(msg2.messageId, 30000);

    return {
      taskId: request.taskId,
      status: codingResult.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
      output: `A2A Orchestration Complete.\nResearch Phase: ${researchResult.output}\nCoding Phase: ${codingResult.output}`,
      metadata: {
        agentsInvolved: 2,
        messagesExchanged: 4,
        subtaskTraces: [researchResult.metadata, codingResult.metadata]
      },
      usage: {
        promptTokens: (researchResult.usage?.promptTokens || 0) + (codingResult.usage?.promptTokens || 0) + 150,
        completionTokens: (researchResult.usage?.completionTokens || 0) + (codingResult.usage?.completionTokens || 0) + 50
      }
    };
  }
}
