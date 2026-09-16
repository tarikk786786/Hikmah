import { Provider } from '../interfaces/provider.js';
import { ProviderHealthManager } from '../health/provider-health-manager.js';
import { ProviderQuotaManager } from '../quotas/provider-quota-manager.js';

export interface ProviderRoutingContext {
  explicitProviderId?: string;
  userPreferredProviderId?: string;
  accountId?: string;
  tenantId?: string;
  allowFailover?: boolean;
}

export interface RoutingExplanation {
  capability: string;
  selectedProviderId: string;
  selectedProviderName: string;
  decisionReason: string;
  evaluatedCandidates: Array<{
    providerId: string;
    healthy: boolean;
    quotaAvailable: boolean;
    capable: boolean;
    score: number;
    reason: string;
  }>;
  failoverOccurred: boolean;
  timestamp: string;
}

export class ProviderRouter {
  private static instance: ProviderRouter;
  private providers: Map<string, Provider> = new Map();
  private defaultProvidersByCategory: Map<string, string> = new Map();
  private healthManager: ProviderHealthManager;
  private quotaManager: ProviderQuotaManager;

  constructor() {
    this.healthManager = ProviderHealthManager.getInstance();
    this.quotaManager = ProviderQuotaManager.getInstance();
  }

  public static getInstance(): ProviderRouter {
    if (!ProviderRouter.instance) {
      ProviderRouter.instance = new ProviderRouter();
    }
    return ProviderRouter.instance;
  }

  public registerProvider(provider: Provider, isDefault = false): void {
    this.providers.set(provider.id, provider);
    if (isDefault || !this.defaultProvidersByCategory.has(provider.category)) {
      this.defaultProvidersByCategory.set(provider.category, provider.id);
    }
  }

  public getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  public setDefaultProvider(category: string, providerId: string): boolean {
    if (!this.providers.has(providerId)) return false;
    this.defaultProvidersByCategory.set(category, providerId);
    return true;
  }

  public getDefaultProviderId(category: string): string | undefined {
    return this.defaultProvidersByCategory.get(category);
  }

  public listProviders(category?: string): Provider[] {
    const all = Array.from(this.providers.values());
    if (category) {
      return all.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    return all;
  }

  /**
   * Routes an operation to the best matching, healthy provider with full explanation.
   */
  public async selectProvider(
    operation: string,
    context?: ProviderRoutingContext
  ): Promise<{ provider: Provider; explanation: RoutingExplanation }> {
    const candidates: Provider[] = [];
    for (const p of this.providers.values()) {
      const caps = await p.capabilities();
      if (caps[operation]) {
        candidates.push(p);
      }
    }

    if (candidates.length === 0) {
      throw new Error(`No registered provider supports capability '${operation}'`);
    }

    const evaluated: RoutingExplanation['evaluatedCandidates'] = [];
    let selected: Provider | null = null;
    let failoverOccurred = false;
    let decisionReason = '';

    // 1. Explicit request takes highest precedence
    if (context?.explicitProviderId) {
      const explicit = candidates.find(c => c.id === context.explicitProviderId);
      if (explicit) {
        const isHealthy = this.healthManager.isAvailable(explicit.id);
        const quota = this.quotaManager.checkQuota(explicit.id);

        if (isHealthy && quota.allowed) {
          selected = explicit;
          decisionReason = `Explicitly requested provider '${explicit.name}' is healthy and authorized`;
        } else if (context.allowFailover) {
          failoverOccurred = true;
          decisionReason = `Explicit provider '${explicit.name}' unavailable (${!isHealthy ? 'unhealthy' : quota.reason}); failing over to alternative`;
        } else {
          throw new Error(`Explicitly requested provider '${explicit.id}' is currently unavailable: ${!isHealthy ? 'circuit breaker tripped/unhealthy' : quota.reason}`);
        }
      }
    }

    // 2. Evaluate all candidates with multi-factor scoring
    for (const candidate of candidates) {
      const isHealthy = this.healthManager.isAvailable(candidate.id);
      const quota = this.quotaManager.checkQuota(candidate.id);
      let score = 0;
      let reason = 'Candidate evaluated';

      if (!isHealthy) {
        score -= 100;
        reason = 'Circuit breaker OPEN or provider unhealthy';
      } else if (!quota.allowed) {
        score -= 50;
        reason = quota.reason || 'Quota exceeded';
      } else {
        score += 10;
        // User preference bonus
        if (context?.userPreferredProviderId === candidate.id) {
          score += 50;
          reason = 'Matches user preferred provider';
        }
        // Category default bonus
        else if (this.defaultProvidersByCategory.get(candidate.category) === candidate.id) {
          score += 30;
          reason = 'Configured category default provider';
        }
      }

      evaluated.push({
        providerId: candidate.id,
        healthy: isHealthy,
        quotaAvailable: quota.allowed,
        capable: true,
        score,
        reason,
      });
    }

    // Sort by score descending
    evaluated.sort((a, b) => b.score - a.score);

    if (!selected) {
      const top = evaluated.find(e => e.healthy && e.quotaAvailable);
      if (!top) {
        throw new Error(`All providers for '${operation}' are currently unavailable or quota-exhausted`);
      }
      selected = this.providers.get(top.providerId)!;
      decisionReason = decisionReason || top.reason;
    }

    const explanation: RoutingExplanation = {
      capability: operation,
      selectedProviderId: selected.id,
      selectedProviderName: selected.name,
      decisionReason,
      evaluatedCandidates: evaluated,
      failoverOccurred,
      timestamp: new Date().toISOString(),
    };

    return { provider: selected, explanation };
  }
}
