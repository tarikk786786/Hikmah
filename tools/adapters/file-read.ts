import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResult, ExecutionContext } from '../registry/types.js';

export const FileReadTool: ToolDefinition = {
  name: 'file_read',
  version: '1.0.0',
  description: 'Read the text contents of a file within the project directory workspace',
  risk: 'MEDIUM',
  timeoutMs: 5000,
  enabled: true,
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string', description: 'Relative path to file' }
    },
    required: ['filePath']
  },
  outputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      sizeBytes: { type: 'number' }
    }
  },
  async execute(input: Record<string, unknown>, _ctx: ExecutionContext): Promise<ToolResult> {
    const start = Date.now();
    const rawPath = String(input.filePath || '').trim();

    if (!rawPath) {
      return {
        success: false,
        error: 'Path cannot be empty',
        executionTimeMs: Date.now() - start
      };
    }

    try {
      const workspaceRoot = process.cwd();
      const resolvedPath = path.resolve(workspaceRoot, rawPath);

      // Sandbox enforcement: ensure target path is within workspace root
      if (!resolvedPath.startsWith(workspaceRoot)) {
        return {
          success: false,
          error: 'Security violation: Access outside of project workspace is forbidden',
          executionTimeMs: Date.now() - start
        };
      }

      if (!fs.existsSync(resolvedPath)) {
        return {
          success: false,
          error: `File not found: ${rawPath}`,
          executionTimeMs: Date.now() - start
        };
      }

      const stat = fs.statSync(resolvedPath);
      if (stat.size > 2 * 1024 * 1024) {
        return {
          success: false,
          error: 'File size exceeds maximum 2MB limit for direct reading',
          executionTimeMs: Date.now() - start
        };
      }

      const content = fs.readFileSync(resolvedPath, 'utf-8');
      return {
        success: true,
        data: {
          path: rawPath,
          sizeBytes: stat.size,
          content
        },
        executionTimeMs: Date.now() - start
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message,
        executionTimeMs: Date.now() - start
      };
    }
  }
};
