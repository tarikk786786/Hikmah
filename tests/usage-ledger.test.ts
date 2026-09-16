import { describe, it, expect, beforeEach } from 'vitest';
import { CostUsageLedger } from '../core/model-router/usage-ledger.js';

describe('PRD 05: CostUsageLedger & Budget Enforcement', () => {
  let ledger: CostUsageLedger;

  beforeEach(() => {
    ledger = new CostUsageLedger();
    ledger.clear();
    ledger.setBudget({ dailyLimitUsd: 5.0, monthlyLimitUsd: 50.0 });
  });

  it('should accurately calculate token cost in USD', () => {
    const pricing = { inputCostPerMillion: 2.5, outputCostPerMillion: 10.0 };
    // 1,000 prompt tokens = $0.0025, 2,000 completion tokens = $0.0200 -> total $0.0225
    const cost = ledger.calculateCost(pricing, 1000, 2000);
    expect(cost).toBe(0.0225);
  });

  it('should record usage and aggregate by provider and model', () => {
    ledger.recordUsage({
      userId: 'user_123',
      providerId: 'openai',
      modelId: 'gpt-4o',
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      estimatedCostUsd: 0.0075,
      latencyMs: 320,
      status: 'SUCCESS'
    });

    ledger.recordUsage({
      userId: 'user_123',
      providerId: 'anthropic',
      modelId: 'claude-3-7-sonnet',
      promptTokens: 2000,
      completionTokens: 1000,
      totalTokens: 3000,
      estimatedCostUsd: 0.021,
      latencyMs: 580,
      status: 'SUCCESS'
    });

    const byProvider = ledger.getSummaryByProvider();
    expect(byProvider['openai'].requestCount).toBe(1);
    expect(byProvider['anthropic'].requestCount).toBe(1);
    expect(byProvider['openai'].totalTokens).toBe(1500);

    const byModel = ledger.getSummaryByModel();
    expect(byModel['gpt-4o']).toBeDefined();
    expect(byModel['claude-3-7-sonnet']).toBeDefined();
  });

  it('should track daily spend and enforce budget cap', () => {
    ledger.setBudget({ dailyLimitUsd: 1.0, monthlyLimitUsd: 10.0 });

    ledger.recordUsage({
      userId: 'user_abc',
      providerId: 'openai',
      modelId: 'gpt-4o',
      promptTokens: 100000,
      completionTokens: 50000,
      totalTokens: 150000,
      estimatedCostUsd: 0.85,
      latencyMs: 400,
      status: 'SUCCESS'
    });

    let budget = ledger.checkBudgetAllowed('user_abc');
    expect(budget.allowed).toBe(true);
    expect(budget.remainingDaily).toBeCloseTo(0.15, 2);

    // Add another usage that exceeds $1.00 daily cap
    ledger.recordUsage({
      userId: 'user_abc',
      providerId: 'openai',
      modelId: 'gpt-4o',
      promptTokens: 50000,
      completionTokens: 25000,
      totalTokens: 75000,
      estimatedCostUsd: 0.45,
      latencyMs: 350,
      status: 'SUCCESS'
    });

    budget = ledger.checkBudgetAllowed('user_abc');
    expect(budget.allowed).toBe(false);
    expect(budget.reason).toContain('Daily budget exceeded');
  });
});
