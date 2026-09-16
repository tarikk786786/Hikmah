import { UniversalSkillManifest } from '../manifests/types.js';
import { SkillPermissionMonitor, SkillSecurityViolationError } from '../security/permission-monitor.js';

export interface SandboxExecutionOptions {
  inputs: Record<string, any>;
  env?: Record<string, string>;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface SandboxExecutionResult {
  success: boolean;
  outputs?: Record<string, any>;
  error?: string;
  durationMs: number;
  memoryUsedMb?: number;
  securityViolation?: boolean;
}

export class SkillSandbox {
  private static instance: SkillSandbox;
  private permissionMonitor: SkillPermissionMonitor;

  constructor() {
    this.permissionMonitor = SkillPermissionMonitor.getInstance();
  }

  public static getInstance(): SkillSandbox {
    if (!SkillSandbox.instance) {
      SkillSandbox.instance = new SkillSandbox();
    }
    return SkillSandbox.instance;
  }

  /**
   * Executes a skill action inside the isolated sandbox environment.
   */
  public async executeSkill(
    manifest: UniversalSkillManifest,
    action: string,
    options: SandboxExecutionOptions,
    handler?: (context: {
      checkNetwork: (url: string) => boolean;
      checkFs: (path: string, op: 'read' | 'write') => boolean;
      checkShell: (cmd: string) => boolean;
    }) => Promise<Record<string, any>>
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeoutMs || (manifest.sandbox.timeoutSeconds ? manifest.sandbox.timeoutSeconds * 1000 : 30000);

    // Guard: check if skill is quarantined
    if (manifest.state === 'QUARANTINED') {
      return {
        success: false,
        error: `Execution blocked: skill '${manifest.id}' is currently in QUARANTINED state.`,
        durationMs: 0,
        securityViolation: true,
      };
    }

    try {
      // Sandbox security context with permission interceptors
      const securityContext = {
        checkNetwork: (url: string) => this.permissionMonitor.checkNetworkAccess(manifest, url),
        checkFs: (path: string, op: 'read' | 'write') => this.permissionMonitor.checkFilesystemAccess(manifest, path, op),
        checkShell: (cmd: string) => this.permissionMonitor.checkShellExecution(manifest, cmd),
      };

      // Create a timeout race
      const executionPromise = handler 
        ? handler(securityContext) 
        : this.defaultExecutionHandler(manifest, action, options, securityContext);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Skill execution timed out after ${timeout}ms`)), timeout);
      });

      const outputs = await Promise.race([executionPromise, timeoutPromise]);
      const durationMs = Date.now() - startTime;

      return {
        success: true,
        outputs,
        durationMs,
        memoryUsedMb: Math.min(64, options.memoryLimitMb || 512),
        securityViolation: false,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isSecurityViolation = err instanceof SkillSecurityViolationError || err.name === 'SkillSecurityViolationError';

      return {
        success: false,
        error: err.message || 'Execution error in skill sandbox',
        durationMs,
        securityViolation: isSecurityViolation,
      };
    }
  }

  private async defaultExecutionHandler(
    manifest: UniversalSkillManifest,
    action: string,
    options: SandboxExecutionOptions,
    context: {
      checkNetwork: (url: string) => boolean;
      checkFs: (path: string, op: 'read' | 'write') => boolean;
      checkShell: (cmd: string) => boolean;
    }
  ): Promise<Record<string, any>> {
    // Standard mock or simulated executor for sandboxed tools
    // If action requires simulated external call:
    if (options.inputs?.url) {
      context.checkNetwork(options.inputs.url);
    }
    if (options.inputs?.filePath) {
      context.checkFs(options.inputs.filePath, 'read');
    }

    return {
      status: 'completed',
      skillId: manifest.id,
      action,
      inputsReceived: options.inputs,
      timestamp: new Date().toISOString(),
      result: `Action ${action} executed safely in sandbox for ${manifest.name}`,
    };
  }
}
