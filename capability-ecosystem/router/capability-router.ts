import { ProviderRouter, RoutingExplanation } from '../providers/routing/provider-router.js';
import { PluginRegistry } from '../registry/plugin-registry.js';
import { PluginPermissionEngine, PermissionCheckResult } from '../permissions/permission-engine.js';
import { AccountRouter, AccountIdentity } from '../accounts/account-router.js';
import { AuthenticationManager } from '../auth/authentication-manager.js';
import { ProviderQuotaManager } from '../providers/quotas/provider-quota-manager.js';

export interface CapabilityExecutionRequest {
  operation: string; // e.g. 'email.search', 'email.send', 'git.get_issue', 'weather.get'
  input: any;
  explicitProviderId?: string;
  userPreferredProviderId?: string;
  accountId?: string;
  accountHint?: string; // 'personal' | 'work'
  approved?: boolean; // for P4/P5 operations
  tenantId?: string;
  userId?: string;
}

export interface CapabilityExecutionResult {
  success: boolean;
  operation: string;
  data?: any;
  providerId: string;
  account: AccountIdentity;
  permissionCheck: PermissionCheckResult;
  routingExplanation: RoutingExplanation;
  error?: string;
}

export class CapabilityRouter {
  private static instance: CapabilityRouter;
  private providerRouter: ProviderRouter;
  private pluginRegistry: PluginRegistry;
  private permissionEngine: PluginPermissionEngine;
  private accountRouter: AccountRouter;
  private authManager: AuthenticationManager;
  private quotaManager: ProviderQuotaManager;

  constructor() {
    this.providerRouter = ProviderRouter.getInstance();
    this.pluginRegistry = PluginRegistry.getInstance();
    this.permissionEngine = PluginPermissionEngine.getInstance();
    this.accountRouter = AccountRouter.getInstance();
    this.authManager = AuthenticationManager.getInstance();
    this.quotaManager = ProviderQuotaManager.getInstance();
  }

  public static getInstance(): CapabilityRouter {
    if (!CapabilityRouter.instance) {
      CapabilityRouter.instance = new CapabilityRouter();
    }
    return CapabilityRouter.instance;
  }

  /**
   * Universal execution path: Operation -> Permission -> Provider Selection -> Account -> Execution
   */
  public async executeCapability(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    const { operation, input, explicitProviderId, userPreferredProviderId, accountId, accountHint, approved } = request;

    // 1. Permission Check (P0 - P5 enforcement)
    const permResult = this.permissionEngine.checkPermission(operation, { approved });
    if (!permResult.allowed) {
      return {
        success: false,
        operation,
        providerId: 'none',
        account: {} as any,
        permissionCheck: permResult,
        routingExplanation: {} as any,
        error: permResult.reason,
      };
    }

    // 2. Select Provider via ProviderRouter (with health, quota, and failover)
    const { provider, explanation } = await this.providerRouter.selectProvider(operation, {
      explicitProviderId,
      userPreferredProviderId,
      allowFailover: true,
    });

    // 3. Resolve Account via AccountRouter
    const providerType = provider.id.split('-')[0]; // 'gmail' -> 'google' if needed
    const normalizedType = providerType === 'gmail' ? 'google' : providerType;
    const account = this.accountRouter.resolveAccount(normalizedType, { accountId, hint: accountHint });

    // 4. Authenticate & obtain scoped credentials
    await provider.authenticate({
      accountId: account.accountId,
      tenantId: request.tenantId || 'default',
      userId: request.userId,
    });

    // 5. Execute operation on canonical provider
    try {
      const data = await provider.execute(operation, input, {
        accountId: account.accountId,
        tenantId: request.tenantId || 'default',
        userId: request.userId,
      });

      // Record quota usage
      this.quotaManager.recordRequest(provider.id);

      return {
        success: true,
        operation,
        data,
        providerId: provider.id,
        account,
        permissionCheck: permResult,
        routingExplanation: explanation,
      };
    } catch (err: any) {
      return {
        success: false,
        operation,
        providerId: provider.id,
        account,
        permissionCheck: permResult,
        routingExplanation: explanation,
        error: err.message,
      };
    }
  }
}
