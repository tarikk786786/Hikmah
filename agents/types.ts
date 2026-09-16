import { CorrelationContext } from '../security/audit/logger.js';
import { ExecutionPlan } from '../core/planner/planner.js';

export type AgentType =
  | 'general'
  | 'research'
  | 'coding'
  | 'browser'
  | 'document'
  | 'security'
  | 'automation'
  | 'voice';

export interface AgentRun {
  id: string;
  agentType: AgentType;
  userId: string;
  conversationId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'awaiting_approval';
  input: Record<string, unknown>;
  plan?: ExecutionPlan;
  output?: Record<string, unknown>;
  error?: string;
  correlation: CorrelationContext;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AgentObservation {
  stepIndex: number;
  data: unknown;
  status: 'nominal' | 'anomaly' | 'retry_required';
  timestamp: string;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  plan(goal: string): Promise<ExecutionPlan>;
  execute(run: AgentRun): Promise<AgentRun>;
  observe?(stepResult: unknown): Promise<AgentObservation>;
  validate(output: Record<string, unknown>): Promise<boolean>;
  recover?(error: Error, run: AgentRun): Promise<AgentRun>;
  summarize(run: AgentRun): Promise<string>;
}
