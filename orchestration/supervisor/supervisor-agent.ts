import { AgentPlanner } from '../planner/agent-planner.js';
import { TaskGraphEngine } from '../graph/task-graph-engine.js';
import { TaskGraph, WorkflowPlan } from '../core/types.js';

export class SupervisorAgent {
  private planner: AgentPlanner;
  private graphEngine: TaskGraphEngine;

  constructor(planner?: AgentPlanner, graphEngine?: TaskGraphEngine) {
    this.planner = planner || AgentPlanner.getInstance();
    this.graphEngine = graphEngine || new TaskGraphEngine();
  }

  /**
   * Evaluates user prompt, formulates a DAG plan, and creates the execution graph
   */
  public async coordinate(
    goal: string,
    options?: { workflowId?: string }
  ): Promise<{ plan: WorkflowPlan; graph: TaskGraph }> {
    const workflowId = options?.workflowId || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Plan and decompose intent
    const plan = this.planner.plan(goal, workflowId);

    // 2. Build DAG task graph
    const graph = this.graphEngine.createGraph(
      workflowId,
      goal,
      plan.tasks,
      plan.dependencies
    );

    return { plan, graph };
  }
}
