import { describe, it, expect } from 'vitest';
import { AgentOrchestrationEngine } from '../orchestration/orchestrator.js';

describe('PRD 20: Full End-to-End Workflow Execution', () => {
  const orchestrator = AgentOrchestrationEngine.getInstance();

  it('should plan, execute, verify, review, and synthesize a complete multi-agent workflow', async () => {
    // 1. Create workflow
    const run = await orchestrator.createWorkflow({
      goal: 'Benchmark database read throughput under 1000 concurrent simulated queries and write report',
      userId: 'usr_test_admin',
      priority: 'HIGH',
      budgetLimit: 2.0,
      tokenBudget: 50000,
    });

    expect(run).toBeDefined();
    expect(run.id).toBeDefined();
    expect(run.status).toBe('PENDING');
    expect(run.tasks.length).toBeGreaterThanOrEqual(2);

    // 2. Execute workflow
    const finishedRun = await orchestrator.executeWorkflow(run.id);

    expect(finishedRun).toBeDefined();
    expect(finishedRun.status).toBe('COMPLETED');
    expect(finishedRun.tasks.every(t => t.status.toLowerCase() === 'completed')).toBe(true);
    expect(finishedRun.finalResult).toBeDefined();
    expect(finishedRun.costUSD).toBeGreaterThanOrEqual(0);
    expect(finishedRun.tokensUsed).toBeGreaterThanOrEqual(0);

    // 3. Verify status retrieval
    const status = await orchestrator.getWorkflowStatus(run.id);
    expect(status?.id).toBe(run.id);
    expect(status?.status).toBe('COMPLETED');

    // 4. Verify evaluation metrics
    const evals = await orchestrator.evaluateWorkflowRun(run.id);
    expect(evals).toBeDefined();
    expect(evals.completionRate).toBe(100);
    expect(evals.overallScore).toBeGreaterThanOrEqual(80);
  });
});
