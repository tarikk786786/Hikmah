import { SkillIntelligenceEngine } from '../../../skills/intelligence/skill-intelligence-engine.js';

export interface McpToolCallRequest {
  tool: string;
  arguments: Record<string, any>;
}

export interface McpToolCallResponse {
  content: Array<{
    type: 'text' | 'json';
    text?: string;
    json?: any;
  }>;
  isError?: boolean;
}

export class SkillsMcpServer {
  private static instance: SkillsMcpServer;
  private engine: SkillIntelligenceEngine;

  constructor() {
    this.engine = SkillIntelligenceEngine.getInstance();
  }

  public static getInstance(): SkillsMcpServer {
    if (!SkillsMcpServer.instance) {
      SkillsMcpServer.instance = new SkillsMcpServer();
    }
    return SkillsMcpServer.instance;
  }

  public getSupportedTools(): Array<{ name: string; description: string; inputSchema: any }> {
    return [
      {
        name: 'skills.search',
        description: 'Search skills by natural language query, capabilities, categories, and tags.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term or capability' },
            categories: { type: 'array', items: { type: 'string' } },
            onlyInstalled: { type: 'boolean' },
          },
          required: ['query'],
        },
      },
      {
        name: 'skills.describe',
        description: 'Inspect detailed metadata, permissions, tools, and manifest of a skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.discover',
        description: 'Discover best matching skills for a high-level user goal.',
        inputSchema: {
          type: 'object',
          properties: { goal: { type: 'string' } },
          required: ['goal'],
        },
      },
      {
        name: 'skills.can_do',
        description: 'Assesses whether Hikmah can accomplish a specific request via existing, composite, or generated skills.',
        inputSchema: {
          type: 'object',
          properties: { intent: { type: 'string' } },
          required: ['intent'],
        },
      },
      {
        name: 'skills.install',
        description: 'Install a skill through the security, compatibility, and sandbox testing pipeline.',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
            force: { type: 'boolean' },
          },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.uninstall',
        description: 'Uninstall a skill from Hikmah.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.enable',
        description: 'Enable an installed skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.disable',
        description: 'Disable an installed skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.update',
        description: 'Update a skill to its latest version with canary test and auto-rollback.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.rollback',
        description: 'Rollback a skill to its previous version.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.scan',
        description: 'Execute security static analysis, secret detection, and declared vs actual permission audit.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.verify',
        description: 'Verify SHA-256 hash and cryptographic signature of a skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.test',
        description: 'Run automated sandbox tests on a skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.benchmark',
        description: 'Benchmark a skill execution latency and memory usage.',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
            action: { type: 'string' },
            inputs: { type: 'object' },
          },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.generate',
        description: 'Generate a new skill scaffold starting in UNVERIFIED state.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
          },
          required: ['name', 'description'],
        },
      },
      {
        name: 'skills.compose',
        description: 'Compose two or more skills into a composite pipeline with permission unions.',
        inputSchema: {
          type: 'object',
          properties: {
            skillIds: { type: 'array', items: { type: 'string' } },
            name: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['skillIds', 'name', 'description'],
        },
      },
      {
        name: 'skills.optimize',
        description: 'Analyze installed skills and return optimization recommendations.',
        inputSchema: { type: 'object' },
      },
      {
        name: 'skills.dependencies',
        description: 'Resolve full dependency tree for a skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.compatibility',
        description: 'Evaluate hardware, platform, and credentials compatibility.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.list_installed',
        description: 'List all currently installed skills.',
        inputSchema: { type: 'object' },
      },
      {
        name: 'skills.list_available',
        description: 'List all available skills across marketplace catalogs.',
        inputSchema: { type: 'object' },
      },
      {
        name: 'skills.publish',
        description: 'Publish a skill to the private or public marketplace registry.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.unpublish',
        description: 'Unpublish a skill from the marketplace.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.security_report',
        description: 'Fetch security scan results and SBOM for a skill.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
          required: ['skillId'],
        },
      },
      {
        name: 'skills.audit',
        description: 'Retrieve security audit events and kill-switch history.',
        inputSchema: {
          type: 'object',
          properties: { skillId: { type: 'string' } },
        },
      },
    ];
  }

  public async handleToolCall(request: McpToolCallRequest): Promise<McpToolCallResponse> {
    const args = request.arguments || {};

    try {
      switch (request.tool) {
        case 'skills.search': {
          const results = this.engine.searchSkills(args.query || '', {
            categories: args.categories,
            onlyInstalled: Boolean(args.onlyInstalled),
          });
          return { content: [{ type: 'json', json: results }] };
        }

        case 'skills.describe': {
          const inspect = await this.engine.inspectSkill(args.skillId);
          if (!inspect) return { content: [{ type: 'text', text: `Skill '${args.skillId}' not found.` }], isError: true };
          return { content: [{ type: 'json', json: inspect }] };
        }

        case 'skills.discover': {
          const matches = this.engine.searchSkills(args.goal || '');
          return { content: [{ type: 'json', json: matches }] };
        }

        case 'skills.can_do': {
          const assessment = this.engine.canHikmahDoThis(args.intent || '');
          return { content: [{ type: 'json', json: assessment }] };
        }

        case 'skills.install': {
          const res = await this.engine.installSkill(args.skillId, { force: Boolean(args.force) });
          return { content: [{ type: 'json', json: res }], isError: !res.success };
        }

        case 'skills.uninstall': {
          const ok = this.engine.uninstallSkill(args.skillId);
          return { content: [{ type: 'json', json: { success: ok, skillId: args.skillId } }] };
        }

        case 'skills.enable': {
          const ok = this.engine.enableSkill(args.skillId, true);
          return { content: [{ type: 'json', json: { success: ok, skillId: args.skillId, enabled: true } }] };
        }

        case 'skills.disable': {
          const ok = this.engine.enableSkill(args.skillId, false);
          return { content: [{ type: 'json', json: { success: ok, skillId: args.skillId, enabled: false } }] };
        }

        case 'skills.update': {
          const res = await this.engine.updateSkill(args.skillId);
          return { content: [{ type: 'json', json: res }], isError: !res.success };
        }

        case 'skills.rollback': {
          const res = this.engine.rollbackSkill(args.skillId);
          return { content: [{ type: 'json', json: res }], isError: !res.success };
        }

        case 'skills.scan': {
          const scan = await this.engine.scanSkill(args.skillId);
          return { content: [{ type: 'json', json: scan }] };
        }

        case 'skills.verify': {
          const skill = this.engine.registry.getSkill(args.skillId);
          return {
            content: [{
              type: 'json',
              json: {
                skillId: args.skillId,
                sha256: skill?.sha256,
                verified: Boolean(skill?.publisher.verified),
                signature: skill?.signature || skill?.publisher.signature,
              },
            }],
          };
        }

        case 'skills.test': {
          const report = await this.engine.testSkill(args.skillId);
          return { content: [{ type: 'json', json: report }] };
        }

        case 'skills.benchmark': {
          const bench = await this.engine.executeSkill(args.skillId, args.action || 'benchmark', {
            inputs: args.inputs || {},
          });
          return { content: [{ type: 'json', json: bench }] };
        }

        case 'skills.generate': {
          const gen = await this.engine.generateSkill({
            name: args.name,
            description: args.description,
            category: args.category,
          });
          return { content: [{ type: 'json', json: gen }] };
        }

        case 'skills.compose': {
          const comp = await this.engine.composeSkills(args.skillIds, args.name, args.description);
          return { content: [{ type: 'json', json: comp }], isError: !comp.success };
        }

        case 'skills.optimize': {
          const recs = this.engine.getOptimizationRecommendations();
          return { content: [{ type: 'json', json: recs }] };
        }

        case 'skills.dependencies': {
          const skill = this.engine.registry.getSkill(args.skillId);
          if (!skill) return { content: [{ type: 'text', text: 'Skill not found' }], isError: true };
          const installedMap = new Map(this.engine.registry.listInstalledSkills().map(s => [s.id, s]));
          const plan = this.engine.resolver.resolveDependencies(skill, installedMap);
          return { content: [{ type: 'json', json: plan }] };
        }

        case 'skills.compatibility': {
          const skill = this.engine.registry.getSkill(args.skillId);
          if (!skill) return { content: [{ type: 'text', text: 'Skill not found' }], isError: true };
          const rep = this.engine.compatibility.evaluateCompatibility(skill);
          return { content: [{ type: 'json', json: rep }] };
        }

        case 'skills.list_installed': {
          const list = this.engine.registry.listInstalledSkills();
          return { content: [{ type: 'json', json: list }] };
        }

        case 'skills.list_available': {
          const list = this.engine.registry.listAvailableSkills();
          return { content: [{ type: 'json', json: list }] };
        }

        case 'skills.security_report': {
          const scan = await this.engine.scanSkill(args.skillId);
          return { content: [{ type: 'json', json: scan }] };
        }

        case 'skills.audit': {
          const log = this.engine.monitor.getAuditLog(args.skillId);
          const killHistory = this.engine.killSwitch.getHistory(args.skillId);
          return { content: [{ type: 'json', json: { auditLog: log, killSwitchEvents: killHistory } }] };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown MCP tool '${request.tool}' in SkillsMcpServer` }],
            isError: true,
          };
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Error executing tool '${request.tool}': ${err.message}` }],
        isError: true,
      };
    }
  }
}
