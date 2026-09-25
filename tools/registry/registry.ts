import { ToolDefinition, ToolResult, ExecutionContext } from './types.js';
import { SafetyClassifier } from '../../core/safety/classifier.js';
import { ApprovalManager } from '../../security/approvals/manager.js';
import { AuditLogger } from '../../security/audit/logger.js';
import { CalculatorTool } from '../adapters/calculator.js';
import { WebSearchTool } from '../adapters/web-search.js';
import { FileReadTool } from '../adapters/file-read.js';
import { SystemStatusTool } from '../adapters/system-status.js';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();
  private safety: SafetyClassifier;

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  constructor(safety?: SafetyClassifier) {
    this.safety = safety || new SafetyClassifier();
    // Register foundational tool adapters
    this.registerTool(CalculatorTool);
    this.registerTool(WebSearchTool);
    this.registerTool(FileReadTool);
    this.registerTool(SystemStatusTool);
  }


  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public register(tool: ToolDefinition): void {
    this.registerTool(tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getToolSchemas(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
    return this.listTools()
      .filter(t => t.enabled)
      .map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
      }));
  }

  public async executeTool(
    name: string,
    input: Record<string, unknown>,
    ctx: ExecutionContext
  ): Promise<ToolResult> {
    const start = Date.now();
    const tool = this.tools.get(name);

    if (!tool) {
      AuditLogger.log('TOOL_NOT_FOUND', 'LOW', ctx.correlation, { toolName: name });
      return {
        success: false,
        error: `Tool "${name}" is not registered in HIKMAH Tool Registry`,
        executionTimeMs: Date.now() - start
      };
    }

    if (!tool.enabled) {
      AuditLogger.log('TOOL_DISABLED', 'LOW', ctx.correlation, { toolName: name });
      return {
        success: false,
        error: `Tool "${name}" is currently disabled`,
        executionTimeMs: Date.now() - start
      };
    }

    // Safety and Risk Evaluation
    const riskEval = this.safety.evaluateToolRisk(name, tool.risk, input);

    if (riskEval.requiresApproval) {
      // Check if already approved via valid approval token
      if (ctx.approvalToken) {
        const approvalReq = ApprovalManager.getRequest(ctx.approvalToken);
        if (approvalReq && approvalReq.status === 'approved') {
          AuditLogger.log('TOOL_APPROVAL_VERIFIED', riskEval.riskLevel, ctx.correlation, {
            toolName: name,
            approvalId: ctx.approvalToken
          });
        } else {
          return {
            success: false,
            error: `Approval token ${ctx.approvalToken} is invalid or has not been approved`,
            executionTimeMs: Date.now() - start
          };
        }
      } else {
        // Create pending approval ticket
        const req = ApprovalManager.createRequest(ctx.userId, name, riskEval.riskLevel, input);
        AuditLogger.log('TOOL_APPROVAL_REQUIRED', riskEval.riskLevel, ctx.correlation, {
          toolName: name,
          approvalId: req.id,
          rationale: riskEval.rationale
        });

        return {
          success: false,
          error: `ACTION_REQUIRES_APPROVAL: Action "${name}" (Risk: ${riskEval.riskLevel}) requires user authorization. Approval Ticket ID: ${req.id}`,
          data: {
            approvalRequired: true,
            approvalId: req.id,
            actionName: name,
            riskLevel: riskEval.riskLevel,
            rationale: riskEval.rationale
          },
          executionTimeMs: Date.now() - start
        };
      }
    }

    // Log pre-execution audit
    AuditLogger.log('TOOL_EXECUTE_START', riskEval.riskLevel, ctx.correlation, { toolName: name, input });

    // Execute with timeout guarantee
    try {
      const execPromise = tool.execute(input, ctx);
      const timeoutPromise = new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${tool.timeoutMs}ms`)), tool.timeoutMs)
      );

      const result = await Promise.race([execPromise, timeoutPromise]);
      AuditLogger.log('TOOL_EXECUTE_SUCCESS', riskEval.riskLevel, ctx.correlation, {
        toolName: name,
        executionTimeMs: result.executionTimeMs
      });
      return result;
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Unknown tool execution error';
      AuditLogger.log('TOOL_EXECUTE_ERROR', riskEval.riskLevel, ctx.correlation, {
        toolName: name,
        error: errorMsg
      });
      return {
        success: false,
        error: errorMsg,
        executionTimeMs: Date.now() - start
      };
    }
  }
}
