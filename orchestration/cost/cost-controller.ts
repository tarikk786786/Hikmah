export interface CostBudget {
  maxWorkflowCostUsd: number;
  maxTaskCostUsd: number;
  currentWorkflowCostUsd: number;
}

export class CostController {
  private static instance: CostController;
  private budgets: Map<string, CostBudget> = new Map();

  public static getInstance(): CostController {
    if (!CostController.instance) {
      CostController.instance = new CostController();
    }
    return CostController.instance;
  }

  public setBudget(workflowId: string, maxWorkflowCostUsd: number = 2.0, maxTaskCostUsd: number = 0.5): CostBudget {
    const budget: CostBudget = {
      maxWorkflowCostUsd,
      maxTaskCostUsd,
      currentWorkflowCostUsd: 0
    };
    this.budgets.set(workflowId, budget);
    return budget;
  }

  public recordExpense(workflowId: string, amountUsd: number): { allowed: boolean; remainingUsd: number; reason?: string } {
    const budget = this.budgets.get(workflowId) || this.setBudget(workflowId);

    if (budget.currentWorkflowCostUsd + amountUsd > budget.maxWorkflowCostUsd) {
      return {
        allowed: false,
        remainingUsd: Math.max(0, budget.maxWorkflowCostUsd - budget.currentWorkflowCostUsd),
        reason: `Workflow cost limit of \$${budget.maxWorkflowCostUsd} exceeded by \$${amountUsd.toFixed(4)}`
      };
    }

    budget.currentWorkflowCostUsd += amountUsd;
    return {
      allowed: true,
      remainingUsd: Number((budget.maxWorkflowCostUsd - budget.currentWorkflowCostUsd).toFixed(4))
    };
  }

  public getBudget(workflowId: string): CostBudget | undefined {
    return this.budgets.get(workflowId);
  }
}
