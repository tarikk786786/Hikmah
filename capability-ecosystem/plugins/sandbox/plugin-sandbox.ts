import { UniversalPluginManifest } from '../manifests/types.js';

export interface PluginSandboxResult {
  success: boolean;
  durationMs: number;
  output?: any;
  error?: string;
  securityViolation?: boolean;
}

export class PluginSandbox {
  private static instance: PluginSandbox;

  public static getInstance(): PluginSandbox {
    if (!PluginSandbox.instance) {
      PluginSandbox.instance = new PluginSandbox();
    }
    return PluginSandbox.instance;
  }

  public async runInSandbox(
    plugin: UniversalPluginManifest,
    action: string,
    payload: any,
    timeoutMs = 5000
  ): Promise<PluginSandboxResult> {
    const start = Date.now();

    if (plugin.certification === 'QUARANTINED') {
      return {
        success: false,
        durationMs: 0,
        error: `Plugin '${plugin.id}' is QUARANTINED and cannot execute.`,
        securityViolation: true,
      };
    }

    try {
      // Simulate isolated container/worker boundary
      const durationMs = Date.now() - start;
      return {
        success: true,
        durationMs,
        output: { status: 'sandbox_ok', pluginId: plugin.id, action, payload },
      };
    } catch (err: any) {
      return {
        success: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  }
}
