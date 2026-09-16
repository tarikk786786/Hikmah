import { AgentHandoff } from '../core/types.js';

export class HandoffManager {
  private static instance: HandoffManager;
  private handoffs: Map<string, AgentHandoff> = new Map();

  public static getInstance(): HandoffManager {
    if (!HandoffManager.instance) {
      HandoffManager.instance = new HandoffManager();
    }
    return HandoffManager.instance;
  }

  public createHandoff(params: {
    workflowId: string;
    fromAgent: string;
    toAgent: string;
    taskId: string;
    summary: string;
    artifacts?: string[];
    evidence?: string[];
    openQuestions?: string[];
    constraints?: Record<string, unknown>;
  }): AgentHandoff {
    const handoffId = `hnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const handoff: AgentHandoff = {
      handoffId,
      workflowId: params.workflowId,
      fromAgent: params.fromAgent,
      toAgent: params.toAgent,
      taskId: params.taskId,
      summary: params.summary,
      artifacts: params.artifacts || [],
      evidence: params.evidence || [],
      openQuestions: params.openQuestions || [],
      constraints: params.constraints || {},
      timestamp: new Date().toISOString()
    };

    this.handoffs.set(handoffId, handoff);
    return handoff;
  }

  public getHandoff(handoffId: string): AgentHandoff | undefined {
    return this.handoffs.get(handoffId);
  }

  public listByWorkflow(workflowId: string): AgentHandoff[] {
    return Array.from(this.handoffs.values()).filter(h => h.workflowId === workflowId);
  }
}
