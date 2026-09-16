import crypto from 'crypto';
import { UniversalPluginManifest } from '../manifests/types.js';
import { PluginRegistry } from '../../registry/plugin-registry.js';
import { PluginSandbox } from '../sandbox/plugin-sandbox.js';

export interface PluginLockFile {
  version: number;
  generatedAt: string;
  plugins: Record<string, { version: string; sha256: string; installedAt: string }>;
}

export class PluginInstaller {
  private static instance: PluginInstaller;
  private registry: PluginRegistry;
  private sandbox: PluginSandbox;
  private lockFile: PluginLockFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    plugins: {},
  };

  constructor() {
    this.registry = PluginRegistry.getInstance();
    this.sandbox = PluginSandbox.getInstance();
  }

  public static getInstance(): PluginInstaller {
    if (!PluginInstaller.instance) {
      PluginInstaller.instance = new PluginInstaller();
    }
    return PluginInstaller.instance;
  }

  public getLockFile(): PluginLockFile {
    return { ...this.lockFile, plugins: { ...this.lockFile.plugins } };
  }

  public async install(pluginId: string): Promise<{ success: boolean; plugin?: UniversalPluginManifest; error?: string }> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      return { success: false, error: `Plugin '${pluginId}' not found in registry.` };
    }

    // 1. Sandbox pre-flight test
    const testResult = await this.sandbox.runInSandbox(plugin, 'init_check', {});
    if (!testResult.success) {
      return { success: false, error: `Sandbox pre-flight check failed: ${testResult.error}` };
    }

    // 2. Lockfile update
    const hash = crypto.createHash('sha256').update(JSON.stringify(plugin)).digest('hex');
    this.lockFile.plugins[plugin.id] = {
      version: plugin.version,
      sha256: hash,
      installedAt: new Date().toISOString(),
    };
    this.lockFile.generatedAt = new Date().toISOString();

    // 3. Mark installed in registry
    this.registry.installPlugin(pluginId);

    return { success: true, plugin };
  }

  public uninstall(pluginId: string): boolean {
    delete this.lockFile.plugins[pluginId];
    this.lockFile.generatedAt = new Date().toISOString();
    return this.registry.uninstallPlugin(pluginId);
  }
}
