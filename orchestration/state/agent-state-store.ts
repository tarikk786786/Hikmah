import { AgentTask, TaskGraph } from '../core/types.js';

export interface WorkflowExecutionState {
  workflowId: string;
  goal: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  activeTasks: string[];
  completedTasks: string[];
  failedTasks: string[];
  taskOutputs: Map<string, Record<string, unknown>>;
  accumulatedCostUsd: number;
  accumulatedTokens: number;
  totalDurationMs: number;
  createdAt: string;
  updatedAt: string;
}

export class AgentStateStore {
  private static instance: AgentStateStore;
  private states: Map<string, WorkflowExecutionState> = new Map();

  public static getInstance(): AgentStateStore {
    if (!AgentStateStore.instance) {
      AgentStateStore.instance = new AgentStateStore();
    }
    return AgentStateStore.instance;
  }

  public initWorkflow(workflowId: string, goal: string): WorkflowExecutionState {
    const state: WorkflowExecutionState = {
      workflowId,
      goal,
      status: 'PENDING',
      activeTasks: [],
      completedTasks: [],
      failedTasks: [],
      taskOutputs: new Map(),
      accumulatedCostUsd: 0,
      accumulatedTokens: 0,
      totalDurationMs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.states.set(workflowId, state);
    return state;
  }

  public getWorkflowState(workflowId: string): WorkflowExecutionState | undefined {
    return this.states.get(workflowId);
  }

  public recordTaskOutput(workflowId: string, taskId: string, output: Record<string, unknown>): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    state.taskOutputs.set(taskId, output);
    if (!state.completedTasks.includes(taskId)) {
      state.completedTasks.push(taskId);
    }
    state.activeTasks = state.activeTasks.filter(id => id !== taskId);
    state.updatedAt = new Date().toISOString();
  }

  public recordCostAndTokens(workflowId: string, costUsd: number, tokens: number): void {
    const state = this.states.get(workflowId);
    if (!state) return;

    state.accumulatedCostUsd += costUsd;
    state.accumulatedTokens += tokens;
    state.updatedAt = new Date().toISOString();
  }

  public getAllStates(): WorkflowExecutionState[] {
    return Array.from(this.states.values());
  }
}
