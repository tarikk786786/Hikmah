import { ToolDefinition, ToolResult, ExecutionContext } from '../registry/types.js';

export const CalculatorTool: ToolDefinition = {
  name: 'calculator',
  version: '1.0.0',
  description: 'Evaluate safe arithmetic operations and expressions (e.g., 24 * 60, sqrt(144))',
  risk: 'LOW',
  timeoutMs: 5000,
  enabled: true,
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Arithmetic expression' }
    },
    required: ['expression']
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'number' }
    }
  },
  async execute(input: Record<string, unknown>, _ctx: ExecutionContext): Promise<ToolResult> {
    const start = Date.now();
    const expr = String(input.expression || '').trim();

    // Whitelist only safe characters: digits, operators, parentheses, decimal point
    if (!/^[0-9+\-*/().^% \t]+$/.test(expr)) {
      return {
        success: false,
        error: 'Invalid expression: contains forbidden non-mathematical characters',
        executionTimeMs: Date.now() - start
      };
    }

    try {
      // Safe evaluation using Function with sanitized input
      const sanitized = expr.replace(/\^/g, '**');
      const val = Function(`"use strict"; return (${sanitized});`)();
      return {
        success: true,
        data: { expression: expr, result: Number(val) },
        executionTimeMs: Date.now() - start
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Evaluation error: ${(err as Error).message}`,
        executionTimeMs: Date.now() - start
      };
    }
  }
};
