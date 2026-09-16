import { ToolDefinition } from '../../../tools/registry/types.js';
import { ToolRegistry } from '../../../tools/registry/registry.js';
import { CapabilityRegistry } from '../../../core/capabilities/registry.js';
import { Capability } from '../../../core/capabilities/types.js';
import { MemoryRouter } from '../../../memory/core/router/router.js';
import { MemoryClassification, MemoryScope, MemoryAuthority } from '../../../memory/core/types.js';

export class MemoryMCPServer {
  private router: MemoryRouter;
  private toolRegistry: ToolRegistry;
  private capabilityRegistry: CapabilityRegistry;

  constructor(
    router?: MemoryRouter,
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry
  ) {
    this.router = router || MemoryRouter.getInstance();
    this.toolRegistry = toolRegistry || ToolRegistry.getInstance();
    this.capabilityRegistry = capabilityRegistry || CapabilityRegistry.getInstance();

    this.registerAllTools();
  }

  private registerAllTools(): void {
    const tools: ToolDefinition[] = [
      // 1. memory_remember
      {
        name: 'memory_remember',
        version: '1.0.0',
        description: 'Store a memory record through the Memory Router with classification, secret protection, and provider dispatch',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to remember' },
            userId: { type: 'string', description: 'User account ID' },
            projectId: { type: 'string', description: 'Optional project ID' },
            classification: { type: 'string', description: 'Explicit classification (optional)' },
            authority: { type: 'string', description: 'Source authority (optional)' }
          },
          required: ['content']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const saved = await this.router.remember({
            content: String(input.content),
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined,
            classification: input.classification as MemoryClassification | undefined,
            authority: (input.authority as MemoryAuthority) || 'USER_EXPLICIT'
          });
          return {
            success: true,
            data: saved,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 2. memory_recall
      {
        name: 'memory_recall',
        version: '1.0.0',
        description: 'Recall relevant memories matching a natural language query with multi-engine retrieval and deduplication',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            queryText: { type: 'string', description: 'Search/recall query' },
            userId: { type: 'string' },
            projectId: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['queryText']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const results = await this.router.recall({
            queryText: String(input.queryText),
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined,
            limit: input.limit ? Number(input.limit) : 10
          });
          return {
            success: true,
            data: { memories: results, count: results.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 3. memory_search
      {
        name: 'memory_search',
        version: '1.0.0',
        description: 'Advanced memory search across specialized providers with classification filters',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            queryText: { type: 'string' },
            targetProvider: { type: 'string', description: 'Target provider ID (mem0, graphiti, cognee, etc.)' },
            classifications: { type: 'array', items: { type: 'string' } },
            userId: { type: 'string' },
            projectId: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['queryText']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const results = await this.router.search({
            queryText: String(input.queryText),
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined,
            targetProvider: input.targetProvider ? String(input.targetProvider) : undefined,
            classifications: input.classifications as MemoryClassification[] | undefined,
            limit: input.limit ? Number(input.limit) : 10
          });
          return {
            success: true,
            data: { results, count: results.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 4. memory_timeline
      {
        name: 'memory_timeline',
        version: '1.0.0',
        description: 'Query temporal evolution and historical changes for a project or entity',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            entityId: { type: 'string' },
            userId: { type: 'string' },
            projectId: { type: 'string' },
            limit: { type: 'number' }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const timeline = await this.router.timeline({
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined,
            entityId: input.entityId ? String(input.entityId) : undefined,
            limit: input.limit ? Number(input.limit) : 20
          });
          return {
            success: true,
            data: { timeline, count: timeline.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 5. memory_related
      {
        name: 'memory_related',
        version: '1.0.0',
        description: 'Traverse knowledge graph relationships and linked concepts for an entity',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            entityId: { type: 'string' },
            userId: { type: 'string' },
            projectId: { type: 'string' }
          },
          required: ['entityId']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const related = await this.router.related({
            entityId: String(input.entityId),
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined
          });
          return {
            success: true,
            data: { related, count: related.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 6. memory_learn
      {
        name: 'memory_learn',
        version: '1.0.0',
        description: 'Record a procedural workflow pattern or user correction for future tasks',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            rule: { type: 'string', description: 'Procedural instruction or correction' },
            userId: { type: 'string' },
            projectId: { type: 'string' }
          },
          required: ['rule']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const saved = await this.router.learn({
            content: String(input.rule),
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined,
            authority: 'USER_EXPLICIT'
          });
          return {
            success: true,
            data: saved,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 7. memory_forget
      {
        name: 'memory_forget',
        version: '1.0.0',
        description: 'Permanently delete a memory across canonical registry and all provider backends',
        risk: 'HIGH',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Memory record ID to delete' }
          },
          required: ['id']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const deleted = await this.router.forget(String(input.id));
          return {
            success: deleted,
            data: { id: input.id, deleted },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 8. memory_consolidate
      {
        name: 'memory_consolidate',
        version: '1.0.0',
        description: 'Consolidate episodic or working memories into durable long-term facts',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['USER', 'PROJECT', 'TEAM', 'GLOBAL'] },
            userId: { type: 'string' },
            projectId: { type: 'string' }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const res = await this.router.consolidate(
            (input.scope as MemoryScope) || 'PROJECT',
            String(input.userId || ctx.userId || 'usr_default'),
            input.projectId ? String(input.projectId) : undefined
          );
          return {
            success: true,
            data: res,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 9. memory_explain
      {
        name: 'memory_explain',
        version: '1.0.0',
        description: 'Explain the origin, provenance, and storage reason for a memory record',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Memory record ID' }
          },
          required: ['id']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const explanation = this.router.explain(String(input.id));
          return {
            success: explanation.found,
            data: explanation,
            executionTimeMs: Date.now() - start
          };
        }
      }
    ];

    for (const tool of tools) {
      this.toolRegistry.registerTool(tool);

      // Register capability
      const cap: Capability = {
        id: `cap_${tool.name}`,
        name: `Memory Router: ${tool.name}`,
        version: '1.0.0',
        category: 'memory',
        description: tool.description,
        provider: 'hikmah-memory-router',
        type: 'STORAGE_PROVIDER',
        input_schema: tool.inputSchema,
        output_schema: tool.outputSchema,
        permissions: ['MEMORY_ACCESS'],
        risk_level: tool.risk,
        runtime: 'VERCEL',
        supported_environments: ['node'],
        timeout: tool.timeoutMs,
        retry_policy: { maxRetries: 2, backoffMs: 1000 },
        enabled: true,
        health_status: 'HEALTHY',
        tags: ['memory', 'router', 'mcp', 'knowledge']
      };

      this.capabilityRegistry.register(cap);
    }
  }
}
