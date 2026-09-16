import { BudgetConfig, BudgetStatus, ModelPricing, UsageRecord } from './types.js';

export class CostUsageLedger {
  private static instance: CostUsageLedger;
  private records: UsageRecord[] = [];
  private budgetConfig: BudgetConfig = {
    dailyLimitUsd: 10.0,
    monthlyLimitUsd: 100.0,
    softCapPercent: 80
  };

  public static getInstance(): CostUsageLedger {
    if (!CostUsageLedger.instance) {
      CostUsageLedger.instance = new CostUsageLedger();
    }
    return CostUsageLedger.instance;
  }

  public setBudget(config: Partial<BudgetConfig>): void {
    this.budgetConfig = { ...this.budgetConfig, ...config };
  }

  public getBudget(): BudgetConfig {
    return { ...this.budgetConfig };
  }

  public calculateCost(pricing: ModelPricing, promptTokens: number, completionTokens: number): number {
    const inputCost = (promptTokens * pricing.inputCostPerMillion) / 1_000_000;
    const outputCost = (completionTokens * pricing.outputCostPerMillion) / 1_000_000;
    return Number((inputCost + outputCost).toFixed(6));
  }

  public recordUsage(entry: Omit<UsageRecord, 'id' | 'timestamp'>): UsageRecord {
    const record: UsageRecord = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.records.push(record);
    return record;
  }

  public getDailySpend(userId?: string): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.records
      .filter((r) => r.timestamp.startsWith(today) && (!userId || r.userId === userId))
      .reduce((sum, r) => sum + r.estimatedCostUsd, 0);
  }

  public getMonthlySpend(userId?: string): number {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return this.records
      .filter((r) => r.timestamp.startsWith(thisMonth) && (!userId || r.userId === userId))
      .reduce((sum, r) => sum + r.estimatedCostUsd, 0);
  }

  public checkBudgetAllowed(userId?: string): BudgetStatus {
    const daily = this.getDailySpend(userId);
    const monthly = this.getMonthlySpend(userId);

    const remainingDaily = Math.max(0, this.budgetConfig.dailyLimitUsd - daily);
    const remainingMonthly = Math.max(0, this.budgetConfig.monthlyLimitUsd - monthly);

    if (daily >= this.budgetConfig.dailyLimitUsd) {
      return {
        allowed: false,
        remainingDaily: 0,
        remainingMonthly,
        currentDaily: daily,
        currentMonthly: monthly,
        reason: `Daily budget exceeded ($${daily.toFixed(2)} / $${this.budgetConfig.dailyLimitUsd.toFixed(2)})`
      };
    }

    if (monthly >= this.budgetConfig.monthlyLimitUsd) {
      return {
        allowed: false,
        remainingDaily,
        remainingMonthly: 0,
        currentDaily: daily,
        currentMonthly: monthly,
        reason: `Monthly budget exceeded ($${monthly.toFixed(2)} / $${this.budgetConfig.monthlyLimitUsd.toFixed(2)})`
      };
    }

    return {
      allowed: true,
      remainingDaily,
      remainingMonthly,
      currentDaily: daily,
      currentMonthly: monthly
    };
  }

  public getSummaryByProvider(): Record<string, { totalTokens: number; totalCostUsd: number; requestCount: number }> {
    const summary: Record<string, { totalTokens: number; totalCostUsd: number; requestCount: number }> = {};
    for (const r of this.records) {
      if (!summary[r.providerId]) {
        summary[r.providerId] = { totalTokens: 0, totalCostUsd: 0, requestCount: 0 };
      }
      summary[r.providerId].totalTokens += r.totalTokens;
      summary[r.providerId].totalCostUsd += r.estimatedCostUsd;
      summary[r.providerId].requestCount += 1;
    }
    for (const k of Object.keys(summary)) {
      summary[k].totalCostUsd = Number(summary[k].totalCostUsd.toFixed(4));
    }
    return summary;
  }

  public getSummaryByModel(): Record<string, { totalTokens: number; totalCostUsd: number; requestCount: number }> {
    const summary: Record<string, { totalTokens: number; totalCostUsd: number; requestCount: number }> = {};
    for (const r of this.records) {
      if (!summary[r.modelId]) {
        summary[r.modelId] = { totalTokens: 0, totalCostUsd: 0, requestCount: 0 };
      }
      summary[r.modelId].totalTokens += r.totalTokens;
      summary[r.modelId].totalCostUsd += r.estimatedCostUsd;
      summary[r.modelId].requestCount += 1;
    }
    for (const k of Object.keys(summary)) {
      summary[k].totalCostUsd = Number(summary[k].totalCostUsd.toFixed(4));
    }
    return summary;
  }

  public getRecentRecords(limit = 50): UsageRecord[] {
    return this.records.slice(-limit).reverse();
  }

  public clear(): void {
    this.records = [];
  }
}
