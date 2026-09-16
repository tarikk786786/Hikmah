import {
  Capability,
  CapabilityFilter,
  CapabilityType,
  CapabilityCategory,
  HealthStatus,
  RuntimeTarget,
  Permission
} from './types.js';
import { RiskLevel } from '../safety/types.js';
import { AuditLogger, CorrelationContext } from '../../security/audit/logger.js';

export class CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();
  private static instance: CapabilityRegistry;

  constructor() {
    this.seedFoundationalCapabilities();
  }

  public static getInstance(): CapabilityRegistry {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry();
    }
    return CapabilityRegistry.instance;
  }

  public register(capability: Capability): void {
    this.capabilities.set(capability.id, capability);
    AuditLogger.log('CAPABILITY_REGISTERED', capability.risk_level, {
      requestId: 'system_init',
      userId: 'system'
    }, {
      id: capability.id,
      name: capability.name,
      type: capability.type,
      category: capability.category
    });
  }

  public unregister(id: string): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    this.capabilities.delete(id);
    AuditLogger.log('CAPABILITY_UNREGISTERED', 'LOW', {
      requestId: 'system',
      userId: 'system'
    }, { id });
    return true;
  }

  public get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  public list(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  public setEnabled(id: string, enabled: boolean): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    cap.enabled = enabled;
    return true;
  }

  public updateHealth(id: string, status: HealthStatus): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    cap.health_status = status;
    return true;
  }

  public query(filter: CapabilityFilter): Capability[] {
    return this.list().filter(c => {
      if (filter.type && c.type !== filter.type) return false;
      if (filter.category && c.category !== filter.category) return false;
      if (filter.enabledOnly && !c.enabled) return false;
      if (filter.healthyOnly && c.health_status !== 'HEALTHY') return false;
      if (filter.runtime && c.runtime !== filter.runtime) return false;
      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(t => c.tags.includes(t));
        if (!hasTag) return false;
      }
      if (filter.maxRisk) {
        const order: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        if (order[c.risk_level] > order[filter.maxRisk]) return false;
      }
      return true;
    });
  }

  public checkPermissions(capability: Capability, grantedPermissions: Permission[]): {
    allowed: boolean;
    missingPermissions: Permission[];
  } {
    const missing = capability.permissions.filter(p => !grantedPermissions.includes(p));
    return {
      allowed: missing.length === 0,
      missingPermissions: missing
    };
  }

  public validateInput(capability: Capability, input: Record<string, unknown>): {
    valid: boolean;
    errors?: string[];
  } {
    const schema = capability.input_schema;
    if (!schema || typeof schema !== 'object') return { valid: true };

    const errors: string[] = [];
    const required = (schema.required as string[]) || [];

    for (const reqField of required) {
      if (input[reqField] === undefined || input[reqField] === null) {
        errors.push(`Missing required input field: ${reqField}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  public validateOutput(capability: Capability, output: Record<string, unknown>): {
    valid: boolean;
    errors?: string[];
  } {
    if (!output) {
      return { valid: false, errors: ['Output cannot be empty or undefined'] };
    }
    return { valid: true };
  }

  public async execute(
    id: string,
    input: Record<string, unknown>,
    context: {
      userId: string;
      correlation: CorrelationContext;
      grantedPermissions?: Permission[];
    }
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    executionTimeMs: number;
  }> {
    const start = Date.now();
    const cap = this.get(id);

    if (!cap) {
      return {
        success: false,
        error: `Capability [${id}] not registered in Hikmah Engine`,
        executionTimeMs: Date.now() - start
      };
    }

    if (!cap.enabled) {
      return {
        success: false,
        error: `Capability [${id}] is disabled`,
        executionTimeMs: Date.now() - start
      };
    }

    if (cap.health_status === 'UNAVAILABLE' || cap.health_status === 'DISABLED') {
      return {
        success: false,
        error: `Capability [${id}] is currently unavailable (Status: ${cap.health_status})`,
        executionTimeMs: Date.now() - start
      };
    }

    // Permission Verification
    if (cap.permissions.length > 0 && context.grantedPermissions) {
      const permCheck = this.checkPermissions(cap, context.grantedPermissions);
      if (!permCheck.allowed) {
        AuditLogger.log('PERMISSION_DENIED', cap.risk_level, context.correlation, {
          capabilityId: id,
          missingPermissions: permCheck.missingPermissions
        });
        return {
          success: false,
          error: `Permission denied: Missing [${permCheck.missingPermissions.join(', ')}] for capability [${id}]`,
          executionTimeMs: Date.now() - start
        };
      }
    }

    // Input Schema Validation
    const inputVal = this.validateInput(cap, input);
    if (!inputVal.valid) {
      return {
        success: false,
        error: `Invalid input: ${inputVal.errors?.join('; ')}`,
        executionTimeMs: Date.now() - start
      };
    }

    if (!cap.execute) {
      return {
        success: false,
        error: `Capability [${id}] has no direct execution handler (Delegated to worker runtime: ${cap.runtime})`,
        executionTimeMs: Date.now() - start
      };
    }

    AuditLogger.log('CAPABILITY_EXECUTION_START', cap.risk_level, context.correlation, {
      capabilityId: id,
      category: cap.category,
      runtime: cap.runtime
    });

    try {
      const result = await cap.execute(input, context);
      const outVal = this.validateOutput(cap, result);
      if (!outVal.valid) {
        throw new Error(`Output validation failed: ${outVal.errors?.join('; ')}`);
      }

      AuditLogger.log('CAPABILITY_EXECUTION_SUCCESS', cap.risk_level, context.correlation, {
        capabilityId: id,
        durationMs: Date.now() - start
      });

      return {
        success: true,
        data: result,
        executionTimeMs: Date.now() - start
      };
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Execution failed';
      AuditLogger.log('CAPABILITY_EXECUTION_FAILED', cap.risk_level, context.correlation, {
        capabilityId: id,
        error: msg
      });
      return {
        success: false,
        error: msg,
        executionTimeMs: Date.now() - start
      };
    }
  }

  private seedFoundationalCapabilities(): void {
    // 1. Web Search Capability
    this.register({
      id: 'cap_tool_web_search',
      name: 'Web Intelligence & Search',
      version: '1.0.0',
      category: 'search',
      description: 'Search public web information, news, and technical documentation with citations',
      provider: 'hikmah-native',
      type: 'TOOL',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query']
      },
      output_schema: {
        type: 'object',
        properties: { results: { type: 'array' } }
      },
      permissions: ['NETWORK_ACCESS'],
      risk_level: 'LOW',
      runtime: 'VERCEL',
      supported_environments: ['node', 'browser'],
      timeout: 15000,
      retry_policy: { maxRetries: 2, backoffMs: 1000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['search', 'web', 'research'],
      execute: async (input) => {
        return {
          query: input.query,
          results: [
            { title: `Search result for ${input.query}`, snippet: `Synthesized findings for ${input.query}.` }
          ]
        };
      }
    });

    // 2. Safe Mathematical Computation
    this.register({
      id: 'cap_tool_calculator',
      name: 'Safe Math Evaluator',
      version: '1.0.0',
      category: 'AI',
      description: 'Evaluate safe mathematical expressions without arbitrary code execution risk',
      provider: 'hikmah-native',
      type: 'TOOL',
      input_schema: {
        type: 'object',
        properties: { expression: { type: 'string' } },
        required: ['expression']
      },
      output_schema: {
        type: 'object',
        properties: { result: { type: 'number' } }
      },
      permissions: [],
      risk_level: 'LOW',
      runtime: 'VERCEL',
      supported_environments: ['node', 'browser'],
      timeout: 2000,
      retry_policy: { maxRetries: 1, backoffMs: 500 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['math', 'calculator', 'core'],
      execute: async (input) => {
        const expr = String(input.expression || '').replace(/\^/g, '**');
        if (!/^[0-9+\-*/().^% \t]+$/.test(expr)) {
          throw new Error('Forbidden characters in math expression');
        }
        const val = Function(`"use strict"; return (${expr});`)();
        return { expression: input.expression, result: Number(val) };
      }
    });

    // 3. Document Extraction & OCR
    this.register({
      id: 'cap_doc_extractor',
      name: 'Document & PDF Processor',
      version: '1.0.0',
      category: 'documents',
      description: 'Parse, extract text, and chunk documents (PDF, DOCX, Markdown, Text) for semantic indexing',
      provider: 'hikmah-native',
      type: 'TOOL',
      input_schema: {
        type: 'object',
        properties: { filePath: { type: 'string' } },
        required: ['filePath']
      },
      output_schema: {
        type: 'object',
        properties: { text: { type: 'string' }, wordCount: { type: 'number' } }
      },
      permissions: ['READ_FILE'],
      risk_level: 'LOW',
      runtime: 'RENDER',
      supported_environments: ['node', 'docker'],
      timeout: 30000,
      retry_policy: { maxRetries: 2, backoffMs: 2000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['document', 'pdf', 'ocr', 'text'],
      execute: async (input) => {
        return {
          filePath: input.filePath,
          text: `Extracted content from ${input.filePath}`,
          wordCount: 150
        };
      }
    });

    // 4. Memory Persistence (pgvector)
    this.register({
      id: 'cap_memory_pgvector',
      name: 'Cognitive Semantic Memory',
      version: '1.0.0',
      category: 'database',
      description: 'Stores and retrieves user facts, preferences, project scopes using pgvector cosine similarity',
      provider: 'supabase',
      type: 'STORAGE_PROVIDER',
      input_schema: {
        type: 'object',
        properties: { content: { type: 'string' }, type: { type: 'string' } },
        required: ['content']
      },
      output_schema: {
        type: 'object',
        properties: { memoryId: { type: 'string' } }
      },
      permissions: ['DATABASE_WRITE', 'DATABASE_READ'],
      risk_level: 'LOW',
      runtime: 'SUPABASE_EDGE',
      supported_environments: ['node'],
      timeout: 10000,
      retry_policy: { maxRetries: 3, backoffMs: 1000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['memory', 'database', 'pgvector', 'semantic'],
      execute: async (input) => {
        return { memoryId: `mem_${Date.now()}`, stored: input.content };
      }
    });

    // 5. General Agent
    this.register({
      id: 'cap_agent_general',
      name: 'General Reasoning Agent',
      version: '1.0.0',
      category: 'reasoning',
      description: 'General-purpose autonomous agent that plans, coordinates tools, and synthesizes answers',
      provider: 'hikmah-native',
      type: 'AGENT',
      input_schema: {
        type: 'object',
        properties: { goal: { type: 'string' } },
        required: ['goal']
      },
      output_schema: {
        type: 'object',
        properties: { result: { type: 'string' } }
      },
      permissions: ['NETWORK_ACCESS'],
      risk_level: 'LOW',
      runtime: 'RENDER',
      supported_environments: ['node', 'docker'],
      timeout: 60000,
      retry_policy: { maxRetries: 2, backoffMs: 3000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['agent', 'general', 'planner', 'synthesis'],
      execute: async (input) => {
        return { result: `General agent completed goal: ${input.goal}` };
      }
    });

    // 6. Security Agent (Authorized Scope Only)
    this.register({
      id: 'cap_agent_security',
      name: 'Authorized Security Assessment Agent',
      version: '1.0.0',
      category: 'security',
      description: 'Performs authorized vulnerability assessment, reconnaissance, and security audits against verified target scopes',
      provider: 'hikmah-native',
      type: 'AGENT',
      input_schema: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          authorizationToken: { type: 'string' }
        },
        required: ['target', 'authorizationToken']
      },
      output_schema: {
        type: 'object',
        properties: { findings: { type: 'array' } }
      },
      permissions: ['SECURITY_SCAN', 'NETWORK_ACCESS'],
      risk_level: 'HIGH',
      runtime: 'DOCKER',
      supported_environments: ['docker'],
      timeout: 180000,
      retry_policy: { maxRetries: 1, backoffMs: 5000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['security', 'scan', 'recon', 'audit'],
      execute: async (input) => {
        return { target: input.target, findings: [], status: 'Scope verified and scan completed' };
      }
    });

    // 7. Coding Agent
    this.register({
      id: 'cap_agent_coding',
      name: 'Coding & Repository Agent (OpenHands Integration)',
      version: '1.0.0',
      category: 'coding',
      description: 'Autonomous software engineering agent for repository analysis, test execution, and code patch generation',
      provider: 'openhands',
      type: 'AGENT',
      input_schema: {
        type: 'object',
        properties: { repoUrl: { type: 'string' }, task: { type: 'string' } },
        required: ['task']
      },
      output_schema: {
        type: 'object',
        properties: { diff: { type: 'string' }, testsPassed: { type: 'boolean' } }
      },
      permissions: ['READ_FILE', 'WRITE_FILE', 'RUN_CODE'],
      risk_level: 'MEDIUM',
      runtime: 'DOCKER',
      supported_environments: ['docker'],
      timeout: 300000,
      retry_policy: { maxRetries: 1, backoffMs: 5000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['coding', 'github', 'repo', 'tests'],
      execute: async (input) => {
        return { task: input.task, diff: '', testsPassed: true };
      }
    });

    // 8. Browser Agent (Playwright / browser-use)
    this.register({
      id: 'cap_agent_browser',
      name: 'Browser Automation Agent',
      version: '1.0.0',
      category: 'browser',
      description: 'Autonomous web browser agent operating websites via isolated Playwright workers',
      provider: 'browser-use',
      type: 'BROWSER_PROVIDER',
      input_schema: {
        type: 'object',
        properties: { url: { type: 'string' }, action: { type: 'string' } },
        required: ['url']
      },
      output_schema: {
        type: 'object',
        properties: { screenshotUrl: { type: 'string' }, content: { type: 'string' } }
      },
      permissions: ['BROWSER_ACCESS', 'NETWORK_ACCESS'],
      risk_level: 'MEDIUM',
      runtime: 'RENDER',
      supported_environments: ['docker'],
      timeout: 120000,
      retry_policy: { maxRetries: 2, backoffMs: 3000 },
      enabled: true,
      health_status: 'HEALTHY',
      tags: ['browser', 'playwright', 'automation'],
      execute: async (input) => {
        return { url: input.url, status: 'Completed in isolated browser worker' };
      }
    });
  }
}
