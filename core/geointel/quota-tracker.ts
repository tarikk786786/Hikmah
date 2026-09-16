export interface ProviderQuotaConfig {
  dailyLimit: number;
}

export class QuotaTracker {
  private static instance: QuotaTracker;
  private dailyLimits: Map<string, number> = new Map([
    ['opencellid', 1000], // OpenCelliD community limit: 1,000 req credits/day
    ['ichnaea', 5000],
    ['osm', 2500]
  ]);
  private dailyUsage: Map<string, { date: string; count: number }> = new Map();

  public static getInstance(): QuotaTracker {
    if (!QuotaTracker.instance) {
      QuotaTracker.instance = new QuotaTracker();
    }
    return QuotaTracker.instance;
  }

  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public setLimit(provider: string, limit: number): void {
    this.dailyLimits.set(provider.toLowerCase(), limit);
  }

  public getLimit(provider: string): number {
    return this.dailyLimits.get(provider.toLowerCase()) || 1000;
  }

  public getDailyCount(provider: string): number {
    const today = this.getTodayKey();
    const usage = this.dailyUsage.get(provider.toLowerCase());
    if (!usage || usage.date !== today) {
      return 0;
    }
    return usage.count;
  }

  public checkAllowed(provider: string, cost: number = 1): boolean {
    const count = this.getDailyCount(provider);
    const limit = this.getLimit(provider);
    return count + cost <= limit;
  }

  public recordUsage(provider: string, _endpoint: string, count: number = 1): void {
    const p = provider.toLowerCase();
    const today = this.getTodayKey();
    const current = this.dailyUsage.get(p);

    if (!current || current.date !== today) {
      this.dailyUsage.set(p, { date: today, count });
    } else {
      current.count += count;
    }
  }

  public getRemaining(provider: string): number {
    const limit = this.getLimit(provider);
    const used = this.getDailyCount(provider);
    return Math.max(0, limit - used);
  }

  public reset(provider?: string): void {
    if (provider) {
      this.dailyUsage.delete(provider.toLowerCase());
    } else {
      this.dailyUsage.clear();
    }
  }

  public clearDailyUsage(): void {
    this.reset();
  }
}

