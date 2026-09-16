import { RiskLevel } from '../../core/safety/types.js';
import { CorrelationContext } from '../../security/audit/logger.js';

export interface ExecutionContext {
  userId: string;
  conversationId?: string;
  correlation: CorrelationContext;
  approvalToken?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface ToolDefinition {
  name: string;
  version: string;
  description: string;
  risk: RiskLevel;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  timeoutMs: number;
  enabled: boolean;
  execute(input: Record<string, unknown>, ctx: ExecutionContext): Promise<ToolResult>;
}
