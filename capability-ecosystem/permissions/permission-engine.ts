export type PermissionTier = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export interface PermissionPolicy {
  operation: string;
  tier: PermissionTier;
  requiresApproval: boolean;
  allowedRoles: string[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  tier: PermissionTier;
  requiresApproval: boolean;
  approved?: boolean;
  reason?: string;
}

export class PluginPermissionEngine {
  private static instance: PluginPermissionEngine;
  private policies: Map<string, PermissionPolicy> = new Map();

  constructor() {
    this.seedDefaultPolicies();
  }

  public static getInstance(): PluginPermissionEngine {
    if (!PluginPermissionEngine.instance) {
      PluginPermissionEngine.instance = new PluginPermissionEngine();
    }
    return PluginPermissionEngine.instance;
  }

  private seedDefaultPolicies(): void {
    // P0: Public Information
    this.registerPolicy('weather.get', 'P0', false);
    this.registerPolicy('search.query', 'P0', false);

    // P1: Local Data & Read
    this.registerPolicy('memory.read', 'P1', false);
    this.registerPolicy('storage.read', 'P1', false);

    // P2: Account Read Operations
    this.registerPolicy('email.search', 'P2', false);
    this.registerPolicy('email.read', 'P2', false);
    this.registerPolicy('calendar.list', 'P2', false);
    this.registerPolicy('git.get_issue', 'P2', false);

    // P3: Account Write Operations
    this.registerPolicy('email.send', 'P3', false);
    this.registerPolicy('email.reply', 'P3', false);
    this.registerPolicy('calendar.create', 'P3', false);
    this.registerPolicy('git.create_pr', 'P3', false);
    this.registerPolicy('storage.write', 'P3', false);

    // P4: Sensitive Modifications (Requires Approval)
    this.registerPolicy('storage.delete', 'P4', true);
    this.registerPolicy('calendar.delete', 'P4', true);
    this.registerPolicy('auth.revoke', 'P4', true);

    // P5: High Impact (Always Requires Human Confirmation)
    this.registerPolicy('payment.charge', 'P5', true);
    this.registerPolicy('database.drop', 'P5', true);
    this.registerPolicy('account.terminate', 'P5', true);
  }

  public registerPolicy(operation: string, tier: PermissionTier, requiresApproval: boolean, allowedRoles = ['admin', 'operator', 'agent']): void {
    this.policies.set(operation, { operation, tier, requiresApproval, allowedRoles });
  }

  public checkPermission(
    operation: string,
    context?: { approved?: boolean; role?: string }
  ): PermissionCheckResult {
    const policy = this.policies.get(operation) || {
      operation,
      tier: 'P3',
      requiresApproval: false,
      allowedRoles: ['admin', 'operator', 'agent'],
    };

    if (policy.requiresApproval && !context?.approved) {
      return {
        allowed: false,
        tier: policy.tier,
        requiresApproval: true,
        reason: `Operation '${operation}' is tier ${policy.tier} and requires explicit human confirmation.`,
      };
    }

    return {
      allowed: true,
      tier: policy.tier,
      requiresApproval: policy.requiresApproval,
      approved: context?.approved,
    };
  }
}
