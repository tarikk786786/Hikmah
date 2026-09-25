export interface PlanStep {
  stepNumber: number;
  description: string;
  toolName?: string;
  parameters?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
}

export class TaskPlanner {
  public createPlan(goal: string, availableTools: string[]): ExecutionPlan {
    const id = `plan_${Date.now()}`;
    const lowerGoal = goal.toLowerCase();
    const steps: PlanStep[] = [];

    // Intelligent heuristic decomposition for Phase 1
    if (lowerGoal.includes('status') || lowerGoal.includes('system') || lowerGoal.includes('health')) {
      steps.push({
        stepNumber: 1,
        description: 'Fetch real-time HIKMAH system telemetry',
        toolName: availableTools.includes('system_status') ? 'system_status' : undefined,
        parameters: {},
        status: 'pending'
      });
      steps.push({
        stepNumber: 2,
        description: 'Analyze telemetry and report to operator',
        status: 'pending'
      });
    } else if (lowerGoal.includes('search') || lowerGoal.includes('research') || lowerGoal.includes('who is') || lowerGoal.includes('what is')) {
      steps.push({
        stepNumber: 1,
        description: `Search public web for: ${goal}`,
        toolName: availableTools.includes('web_search') ? 'web_search' : undefined,
        parameters: { query: goal },
        status: 'pending'
      });
      steps.push({
        stepNumber: 2,
        description: 'Synthesize findings and cite sources',
        status: 'pending'
      });
    } else if (lowerGoal.includes('calculate') || lowerGoal.includes('compute') || /^[0-9+\-*/().^% \t]+$/.test(lowerGoal)) {
      steps.push({
        stepNumber: 1,
        description: `Calculate arithmetic expression`,
        toolName: availableTools.includes('calculator') ? 'calculator' : undefined,
        parameters: { expression: goal.replace(/calculate|compute/gi, '').trim() },
        status: 'pending'
      });
    } else if (lowerGoal.includes('read') && lowerGoal.includes('file')) {
      steps.push({
        stepNumber: 1,
        description: 'Locate and read target workspace file safely',
        toolName: availableTools.includes('file_read') ? 'file_read' : undefined,
        parameters: { filePath: 'package.json' },
        status: 'pending'
      });
      steps.push({
        stepNumber: 2,
        description: 'Extract requested content',
        status: 'pending'
      });
    } else {
      steps.push({
        stepNumber: 1,
        description: 'Analyze request and context',
        status: 'pending'
      });
      steps.push({
        stepNumber: 2,
        description: 'Generate comprehensive assistant response',
        status: 'pending'
      });
    }

    return {
      id,
      goal,
      steps,
      status: 'planned',
      createdAt: new Date().toISOString()
    };
  }
}
