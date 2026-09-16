import { AgentTask, TaskGraph } from '../core/types.js';

export interface ReplayFrame {
  stepIndex: number;
  timestamp: string;
  taskId: string;
  agentType: string;
  objective: string;
  status: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  artifacts?: string[];
  durationMs?: number;
}

export interface WorkflowReplay {
  workflowId: string;
  goal: string;
  frames: ReplayFrame[];
  totalSteps: number;
  totalDurationMs: number;
}

export class WorkflowReplayEngine {
  private static instance: WorkflowReplayEngine;

  public static getInstance(): WorkflowReplayEngine {
    if (!WorkflowReplayEngine.instance) {
      WorkflowReplayEngine.instance = new WorkflowReplayEngine();
    }
    return WorkflowReplayEngine.instance;
  }

  /**
   * Constructs an observable replay sequence from a completed task graph
   */
  public generateReplay(graph: TaskGraph): WorkflowReplay {
    const nodes = Array.from(graph.nodes.values());
    // Sort chronologically by startedAt or createdAt
    nodes.sort((a, b) => {
      const timeA = new Date(a.task.startedAt || a.task.createdAt).getTime();
      const timeB = new Date(b.task.startedAt || b.task.createdAt).getTime();
      return timeA - timeB;
    });

    const frames: ReplayFrame[] = nodes.map((node, idx) => {
      const start = node.task.startedAt ? new Date(node.task.startedAt).getTime() : 0;
      const end = node.task.completedAt ? new Date(node.task.completedAt).getTime() : 0;
      const durationMs = end > start ? end - start : undefined;

      return {
        stepIndex: idx + 1,
        timestamp: node.task.startedAt || node.task.createdAt,
        taskId: node.task.taskId,
        agentType: node.task.agentType,
        objective: node.task.objective,
        status: node.task.status,
        inputs: node.task.inputs,
        outputs: node.task.outputs,
        artifacts: node.task.artifacts,
        durationMs
      };
    });

    const totalDurationMs = frames.reduce((acc, f) => acc + (f.durationMs || 0), 0);

    return {
      workflowId: graph.workflowId,
      goal: graph.goal,
      frames,
      totalSteps: frames.length,
      totalDurationMs
    };
  }
}
