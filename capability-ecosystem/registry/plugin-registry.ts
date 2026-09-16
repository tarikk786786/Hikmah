import { UniversalPluginManifest } from '../plugins/manifests/types.js';

export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, UniversalPluginManifest> = new Map();

  constructor() {
    this.seedDefaultPlugins();
  }

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  public getPlugin(id: string): UniversalPluginManifest | undefined {
    return this.plugins.get(id);
  }

  public listPlugins(onlyInstalled = false): UniversalPluginManifest[] {
    const list = Array.from(this.plugins.values());
    return onlyInstalled ? list.filter(p => p.isInstalled) : list;
  }

  public registerPlugin(plugin: UniversalPluginManifest): void {
    this.plugins.set(plugin.id, plugin);
  }

  public enablePlugin(id: string, enabled: boolean): boolean {
    const p = this.plugins.get(id);
    if (!p) return false;
    p.enabled = enabled;
    p.updatedAt = new Date().toISOString();
    return true;
  }

  public installPlugin(id: string): boolean {
    const p = this.plugins.get(id);
    if (!p) return false;
    p.isInstalled = true;
    p.enabled = true;
    p.installedAt = new Date().toISOString();
    return true;
  }

  public uninstallPlugin(id: string): boolean {
    const p = this.plugins.get(id);
    if (!p) return false;
    p.isInstalled = false;
    p.enabled = false;
    return true;
  }

  private seedDefaultPlugins(): void {
    const defaults: UniversalPluginManifest[] = [
      {
        id: 'gmail-integration',
        name: 'Google Gmail Integration Plugin',
        version: '1.4.0',
        description: 'Comprehensive Gmail integration packaging search, read, send, reply, and label tools.',
        type: 'integration',
        publisher: { name: 'Google Cloud Ecosystem', verified: true },
        license: 'Apache-2.0',
        capabilities: ['email.search', 'email.read', 'email.send', 'email.reply'],
        providers: ['gmail-provider'],
        mcp: {
          server: 'gmail-mcp',
          tools: ['email.search', 'email.read', 'email.send', 'email.reply'],
        },
        permissions: {
          network: true,
          allowedDomains: ['gmail.googleapis.com'],
          account: 'google',
          credentials: ['oauth2'],
          risk: { read: 'LOW', write: 'HIGH' },
        },
        runtime: { type: 'container', requirements: 'node: >=20' },
        dependencies: { plugins: [], providers: ['gmail-provider'], skills: [] },
        accounts: { supported: true, multiple: true },
        sandbox: { required: true },
        certification: 'CERTIFIED',
        enabled: true,
        isInstalled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'outlook-integration',
        name: 'Microsoft Outlook & Graph Integration Plugin',
        version: '1.2.0',
        description: 'Microsoft 365 Outlook integration packaging mailbox search, drafting, and sending tools.',
        type: 'integration',
        publisher: { name: 'Microsoft Graph Ecosystem', verified: true },
        license: 'MIT',
        capabilities: ['email.search', 'email.read', 'email.send', 'email.reply'],
        providers: ['outlook-provider'],
        mcp: {
          server: 'outlook-mcp',
          tools: ['email.search', 'email.read', 'email.send', 'email.reply'],
        },
        permissions: {
          network: true,
          allowedDomains: ['graph.microsoft.com'],
          account: 'microsoft',
          credentials: ['oauth2'],
          risk: { read: 'LOW', write: 'HIGH' },
        },
        runtime: { type: 'container', requirements: 'node: >=20' },
        dependencies: { plugins: [], providers: ['outlook-provider'], skills: [] },
        accounts: { supported: true, multiple: true },
        sandbox: { required: true },
        certification: 'CERTIFIED',
        enabled: true,
        isInstalled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'github-ops-plugin',
        name: 'GitHub DevOps & Repository Ops Plugin',
        version: '2.0.0',
        description: 'Integrates GitHub repositories, issues, pull requests, and automated branch inspections.',
        type: 'integration',
        publisher: { name: 'GitHub Ecosystem', verified: true },
        license: 'MIT',
        capabilities: ['git.search_repos', 'git.get_issue', 'git.create_pr'],
        providers: ['github-provider'],
        mcp: {
          server: 'github-mcp',
          tools: ['git.search_repos', 'git.get_issue', 'git.create_pr'],
        },
        permissions: {
          network: true,
          allowedDomains: ['api.github.com'],
          account: 'github',
          credentials: ['oauth2', 'pat'],
          risk: { read: 'LOW', write: 'HIGH' },
        },
        runtime: { type: 'container', requirements: 'node: >=20' },
        dependencies: { plugins: [], providers: ['github-provider'], skills: [] },
        accounts: { supported: true, multiple: true },
        sandbox: { required: true },
        certification: 'CERTIFIED',
        enabled: true,
        isInstalled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'slack-alerts-plugin',
        name: 'Slack Alerts & Channel Notification Plugin',
        version: '1.1.0',
        description: 'Outbound webhook and messaging bot integration for team alerts and automated notifications.',
        type: 'integration',
        publisher: { name: 'Slack Technologies', verified: true },
        license: 'MIT',
        capabilities: ['communication.send_message', 'communication.send_notification'],
        providers: ['slack-provider'],
        permissions: {
          network: true,
          allowedDomains: ['slack.com'],
          credentials: ['webhook_url', 'bot_token'],
          risk: { read: 'LOW', write: 'LOW' },
        },
        runtime: { type: 'process' },
        dependencies: { plugins: [], providers: ['slack-provider'], skills: [] },
        accounts: { supported: false, multiple: false },
        sandbox: { required: false },
        certification: 'CERTIFIED',
        enabled: true,
        isInstalled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of defaults) {
      this.plugins.set(p.id, p);
    }
  }
}
