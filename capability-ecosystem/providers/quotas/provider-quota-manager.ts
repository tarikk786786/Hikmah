export interface QuotaLimit {
  maxRequestsPerMinute?: number;
  maxRequestsPerDay?: number;
  maxTokensPerDay?: number;
}

export interface QuotaUsage {
  requestsThisMinute: number;
  requestsToday: number;
  tokensToday: number;
  minuteWindowStart: number;
  dayWindowStart: number;
}

export class ProviderQuotaManager {
  private static instance: ProviderQuotaManager;
  private limits: Map<string, QuotaLimit> = new Map();
  private usage: Map<string, QuotaUsage> = new Map();

  public static getInstance(): ProviderQuotaManager {
    if (!ProviderQuotaManager.instance) {
      ProviderQuotaManager.instance = new ProviderQuotaManager();
    }
    return ProviderQuotaManager.instance;
  }

  public setLimit(providerId: string, limit: QuotaLimit): void {
    this.limits.set(providerId, limit);
  }

  public getLimit(providerId: string): QuotaLimit | undefined {
    return this.limits.get(providerId);
  }

  public getUsage(providerId: string): QuotaUsage {
    const now = Date.now();
    let u = this.usage.get(providerId);

    if (!u) {
      u = {
        requestsThisMinute: 0,
        requestsToday: 0,
        tokensToday: 0,
        minuteWindowStart: now,
        dayWindowStart: now,
      };
      this.usage.set(providerId, u);
    } else {
      // Reset minute window if 60s passed
      if (now - u.minuteWindowStart > 60000) {
        u.requestsThisMinute = 0;
        u.minuteWindowStart = now;
      }
      // Reset day window if 24h passed
      if (now - u.dayWindowStart > 86400000) {
        u.requestsToday = 0;
        u.tokensToday = 0;
        u.dayWindowStart = now;
      }
    }

    return u;
  }

  public checkQuota(providerId: string): { allowed: boolean; reason?: string } {
    const limit = this.limits.get(providerId);
    if (!limit) return { allowed: true };

    const u = this.getUsage(providerId);

    if (limit.maxRequestsPerMinute && u.requestsThisMinute >= limit.maxRequestsPerMinute) {
      return { allowed: false, reason: `Rate limit reached: ${limit.maxRequestsPerMinute} req/min` };
    }

    if (limit.maxRequestsPerDay && u.requestsToday >= limit.maxRequestsPerDay) {
      return { allowed: false, reason: `Daily limit reached: ${limit.maxRequestsPerDay} req/day` };
    }

    return { allowed: true };
  }

  public recordRequest(providerId: string, tokens: number = 0): void {
    const u = this.getUsage(providerId);
    u.requestsThisMinute++;
    u.requestsToday++;
    u.tokensToday += tokens;
  }
}
