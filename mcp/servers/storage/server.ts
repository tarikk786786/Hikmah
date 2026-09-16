import { ToolDefinition } from '../../../tools/registry/types.js';
import { ToolRegistry } from '../../../tools/registry/registry.js';
import { CapabilityRegistry } from '../../../core/capabilities/registry.js';
import { Capability } from '../../../core/capabilities/types.js';
import { StorageOrchestrator } from '../../../storage/core/orchestrator.js';
import { BackupEngine } from '../../../storage/core/backup/backup-engine.js';
import { StorageTier, StorageClassification, BackupType } from '../../../storage/core/types.js';

export class StorageMCPServer {
  private orchestrator: StorageOrchestrator;
  private backupEngine: BackupEngine;
  private toolRegistry: ToolRegistry;
  private capabilityRegistry: CapabilityRegistry;

  constructor(
    orchestrator?: StorageOrchestrator,
    backupEngine?: BackupEngine,
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry
  ) {
    this.orchestrator = orchestrator || StorageOrchestrator.getInstance();
    this.backupEngine = backupEngine || BackupEngine.getInstance();
    this.toolRegistry = toolRegistry || ToolRegistry.getInstance();
    this.capabilityRegistry = capabilityRegistry || CapabilityRegistry.getInstance();

    this.registerAllTools();
  }

  private registerAllTools(): void {
    const tools: ToolDefinition[] = [
      // 1. storage_put
      {
        name: 'storage_put',
        version: '1.0.0',
        description: 'Upload or store an object through the Universal Storage Engine with deduplication, tiering, chunking, and encryption',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Destination object key or path' },
            data: { type: 'string', description: 'Content payload (text or base64)' },
            isBase64: { type: 'boolean', description: 'Whether the data payload is base64 encoded' },
            mimeType: { type: 'string', description: 'MIME type' },
            tier: { type: 'string', enum: ['HOT', 'NORMAL', 'COLD', 'ARCHIVE'] },
            classification: { type: 'string', enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET'] },
            encrypt: { type: 'boolean', description: 'Whether to enforce AES-256-GCM envelope encryption' },
            userId: { type: 'string' },
            projectId: { type: 'string' }
          },
          required: ['key', 'data']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const buffer = input.isBase64
            ? Buffer.from(String(input.data), 'base64')
            : Buffer.from(String(input.data), 'utf-8');

          const obj = await this.orchestrator.put({
            key: String(input.key),
            data: buffer,
            mimeType: input.mimeType ? String(input.mimeType) : undefined,
            tier: input.tier as StorageTier | undefined,
            classification: input.classification as StorageClassification | undefined,
            encrypt: Boolean(input.encrypt),
            userId: String(input.userId || ctx.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined
          });

          return {
            success: true,
            data: obj,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 2. storage_get
      {
        name: 'storage_get',
        version: '1.0.0',
        description: 'Retrieve an object from storage with transparent chunk reassembly and decryption',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            keyOrId: { type: 'string', description: 'Object key or canonical ID' },
            encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' }
          },
          required: ['keyOrId']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const buffer = await this.orchestrator.get(String(input.keyOrId));
          const meta = await this.orchestrator.metadata(String(input.keyOrId));

          const encoding = input.encoding === 'base64' ? 'base64' : 'utf-8';
          return {
            success: true,
            data: {
              content: buffer.toString(encoding),
              encoding,
              metadata: meta
            },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 3. storage_delete
      {
        name: 'storage_delete',
        version: '1.0.0',
        description: 'Delete or purge an object from storage',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            keyOrId: { type: 'string', description: 'Object key or ID' },
            purge: { type: 'boolean', description: 'Whether to permanently purge physical storage and keys' }
          },
          required: ['keyOrId']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const deleted = await this.orchestrator.delete(String(input.keyOrId), { purge: Boolean(input.purge) });
          return {
            success: deleted,
            data: { deleted, keyOrId: input.keyOrId },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 4. storage_list
      {
        name: 'storage_list',
        version: '1.0.0',
        description: 'List stored objects with optional tier, user, and prefix filters',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            tier: { type: 'string', enum: ['HOT', 'NORMAL', 'COLD', 'ARCHIVE'] },
            prefix: { type: 'string', description: 'Path prefix' },
            userId: { type: 'string' }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const objects = await this.orchestrator.list({
            tier: input.tier as StorageTier | undefined,
            prefix: input.prefix ? String(input.prefix) : undefined,
            userId: input.userId ? String(input.userId) : (ctx.userId || undefined)
          });
          return {
            success: true,
            data: { objects, count: objects.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 5. storage_search
      {
        name: 'storage_search',
        version: '1.0.0',
        description: 'Search files across stored objects by name, key, or metadata',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term' },
            tier: { type: 'string', enum: ['HOT', 'NORMAL', 'COLD', 'ARCHIVE'] }
          },
          required: ['query']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const matches = await this.orchestrator.search(String(input.query), {
            tier: input.tier as StorageTier | undefined
          });
          return {
            success: true,
            data: { matches, count: matches.length },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 6. storage_copy
      {
        name: 'storage_copy',
        version: '1.0.0',
        description: 'Copy an object using zero-copy deduplication',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            srcKeyOrId: { type: 'string', description: 'Source key or ID' },
            destKey: { type: 'string', description: 'Destination key' }
          },
          required: ['srcKeyOrId', 'destKey']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const copied = await this.orchestrator.copy(String(input.srcKeyOrId), String(input.destKey));
          return {
            success: true,
            data: copied,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 7. storage_move
      {
        name: 'storage_move',
        version: '1.0.0',
        description: 'Move an object to a new key/path',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            srcKeyOrId: { type: 'string', description: 'Source key or ID' },
            destKey: { type: 'string', description: 'Destination key' }
          },
          required: ['srcKeyOrId', 'destKey']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const moved = await this.orchestrator.move(String(input.srcKeyOrId), String(input.destKey));
          return {
            success: true,
            data: moved,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 8. storage_share
      {
        name: 'storage_share',
        version: '1.0.0',
        description: 'Generate an expiring secure share token for an object',
        risk: 'MEDIUM',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            keyOrId: { type: 'string', description: 'Object key or ID' },
            accessLevel: { type: 'string', enum: ['READ', 'DOWNLOAD'], default: 'READ' },
            expiresInSeconds: { type: 'number', default: 86400 },
            password: { type: 'string', description: 'Optional password protection' }
          },
          required: ['keyOrId']
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const share = await this.orchestrator.share(String(input.keyOrId), {
            accessLevel: (input.accessLevel as 'READ' | 'DOWNLOAD') || 'READ',
            expiresInSeconds: typeof input.expiresInSeconds === 'number' ? input.expiresInSeconds : 86400,
            password: input.password ? String(input.password) : undefined,
            userId: ctx.userId || 'usr_default'
          });
          return {
            success: true,
            data: share,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 9. storage_revoke_share
      {
        name: 'storage_revoke_share',
        version: '1.0.0',
        description: 'Revoke an active share token',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            shareTokenOrId: { type: 'string', description: 'Share token or share ID' }
          },
          required: ['shareTokenOrId']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const revoked = await this.orchestrator.revokeShare(String(input.shareTokenOrId));
          return {
            success: revoked,
            data: { revoked },
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 10. storage_verify
      {
        name: 'storage_verify',
        version: '1.0.0',
        description: 'Cryptographically verify object integrity against SHA-256 and chunk hashes',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            keyOrId: { type: 'string', description: 'Object key or ID' }
          },
          required: ['keyOrId']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const result = await this.orchestrator.verify(String(input.keyOrId));
          return {
            success: result.valid,
            data: result,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 11. storage_backup
      {
        name: 'storage_backup',
        version: '1.0.0',
        description: 'Create an automated backup snapshot with cryptographic manifest',
        risk: 'LOW',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['DATABASE', 'GIT_REPO', 'MEMORY', 'STORAGE', 'FULL'], default: 'DATABASE' },
            name: { type: 'string', description: 'Custom backup name' },
            encrypt: { type: 'boolean', default: true }
          }
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const manifest = await this.backupEngine.createBackup({
            type: (input.type as BackupType) || 'DATABASE',
            name: input.name ? String(input.name) : undefined,
            encrypt: Boolean(input.encrypt ?? true)
          });
          return {
            success: true,
            data: manifest,
            executionTimeMs: Date.now() - start
          };
        }
      },

      // 12. storage_restore
      {
        name: 'storage_restore',
        version: '1.0.0',
        description: 'Restore and verify a backup snapshot',
        risk: 'HIGH',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            backupId: { type: 'string', description: 'Backup ID to restore' },
            dryRun: { type: 'boolean', default: false }
          },
          required: ['backupId']
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const result = await this.backupEngine.restoreBackup(String(input.backupId), {
            dryRun: Boolean(input.dryRun)
          });
          return {
            success: result.success,
            data: result,
            executionTimeMs: Date.now() - start
          };
        }
      }
    ];

    for (const tool of tools) {
      this.toolRegistry.registerTool(tool);

      const cap: Capability = {
        id: `cap_${tool.name}`,
        name: `Universal Storage: ${tool.name}`,
        version: '1.0.0',
        category: 'storage',
        description: tool.description,
        provider: 'hikmah-storage',
        type: 'STORAGE_PROVIDER',
        input_schema: tool.inputSchema,
        output_schema: tool.outputSchema,
        permissions: ['STORAGE_ACCESS'],
        risk_level: tool.risk,
        runtime: 'VERCEL',
        supported_environments: ['node'],
        timeout: tool.timeoutMs,
        retry_policy: { maxRetries: 2, backoffMs: 1000 },
        enabled: true,
        health_status: 'HEALTHY',
        tags: ['storage', 'mcp', 'files']
      };
      this.capabilityRegistry.register(cap);
    }
  }
}
