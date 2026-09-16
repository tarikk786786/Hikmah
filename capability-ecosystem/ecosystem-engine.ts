import { CapabilityRouter, CapabilityExecutionRequest, CapabilityExecutionResult } from './router/capability-router.js';
import { ProviderRouter } from './providers/routing/provider-router.js';
import { PluginRegistry } from './registry/plugin-registry.js';
import { ProviderHealthManager } from './providers/health/provider-health-manager.js';
import { ProviderQuotaManager } from './providers/quotas/provider-quota-manager.js';
import { AuthenticationManager } from './auth/authentication-manager.js';
import { OAuthManager } from './oauth/oauth-manager.js';
import { AccountRouter } from './accounts/account-router.js';
import { PluginPermissionEngine } from './permissions/permission-engine.js';
import { WebhookManager } from './webhooks/webhook-manager.js';
import { UniversalEventGateway } from './events/event-gateway.js';
import { PluginInstaller } from './plugins/installer/plugin-installer.js';
import { PluginSandbox } from './plugins/sandbox/plugin-sandbox.js';

// Provider Implementations
import { GmailProvider, OutlookProvider } from './providers/implementations/email-providers.js';
import {
  GoogleCalendarProvider,
  GitHubProvider,
  SlackProvider,
  SearxngProvider,
  OpenMeteoProvider,
} from './providers/implementations/service-providers.js';

export class CapabilityEcosystemEngine {
  private static instance: CapabilityEcosystemEngine;

  public readonly router: CapabilityRouter;
  public readonly providerRouter: ProviderRouter;
  public readonly pluginRegistry: PluginRegistry;
  public readonly healthManager: ProviderHealthManager;
  public readonly quotaManager: ProviderQuotaManager;
  public readonly authManager: AuthenticationManager;
  public readonly oauthManager: OAuthManager;
  public readonly accountRouter: AccountRouter;
  public readonly permissionEngine: PluginPermissionEngine;
  public readonly webhookManager: WebhookManager;
  public readonly eventGateway: UniversalEventGateway;
  public readonly installer: PluginInstaller;
  public readonly sandbox: PluginSandbox;

  constructor() {
    this.router = CapabilityRouter.getInstance();
    this.providerRouter = ProviderRouter.getInstance();
    this.pluginRegistry = PluginRegistry.getInstance();
    this.healthManager = ProviderHealthManager.getInstance();
    this.quotaManager = ProviderQuotaManager.getInstance();
    this.authManager = AuthenticationManager.getInstance();
    this.oauthManager = OAuthManager.getInstance();
    this.accountRouter = AccountRouter.getInstance();
    this.permissionEngine = PluginPermissionEngine.getInstance();
    this.webhookManager = WebhookManager.getInstance();
    this.eventGateway = UniversalEventGateway.getInstance();
    this.installer = PluginInstaller.getInstance();
    this.sandbox = PluginSandbox.getInstance();

    this.registerCoreProviders();
  }

  public static getInstance(): CapabilityEcosystemEngine {
    if (!CapabilityEcosystemEngine.instance) {
      CapabilityEcosystemEngine.instance = new CapabilityEcosystemEngine();
    }
    return CapabilityEcosystemEngine.instance;
  }

  private registerCoreProviders(): void {
    // Register Email providers (Gmail as default, Outlook as interchangeable alternative)
    this.providerRouter.registerProvider(new GmailProvider(), true);
    this.providerRouter.registerProvider(new OutlookProvider(), false);

    // Register Calendar providers
    this.providerRouter.registerProvider(new GoogleCalendarProvider(), true);

    // Register Git provider
    this.providerRouter.registerProvider(new GitHubProvider(), true);

    // Register Communication provider
    this.providerRouter.registerProvider(new SlackProvider(), true);

    // Register Search provider
    this.providerRouter.registerProvider(new SearxngProvider(), true);

    // Register Weather provider
    this.providerRouter.registerProvider(new OpenMeteoProvider(), true);
  }

  public async execute(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    return this.router.executeCapability(request);
  }
}
