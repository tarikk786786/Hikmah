import { AIAgent } from '../types/universal.js';

export interface AgentExecutionRequest {
  taskId: string;
  instructions: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AgentExecutionResult {
  taskId: string;
  status: 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  output: string;
  metadata?: Record<string, unknown>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface IAgentProvider {
  /**
   * The underlying technology or framework this adapter wraps (e.g. 'langgraph', 'openhands', 'mcp')
   */
  providerId: string;

  /**
   * Initialize the external provider
   */
  initialize(): Promise<void>;

  /**
   * Execute a task using the external provider's runtime
   */
  execute(agent: AIAgent, request: AgentExecutionRequest): Promise<AgentExecutionResult>;

  /**
   * Stream a task execution (if supported)
   */
  stream?(agent: AIAgent, request: AgentExecutionRequest): AsyncIterable<string>;
}
