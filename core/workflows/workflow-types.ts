export interface WorkflowStep {
  id: string;
  name: string;
  taskType: string;
  dependsOn: string[];
  inputTemplate: Record<string, unknown>;
  isOptional?: boolean;
  timeoutMs?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
}

export type WorkflowRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;
  status: WorkflowRunStatus;
  stepTasks: Record<string, string>; // stepId -> taskId
  stepStates: Record<string, 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'SKIPPED'>;
  progress: number; // 0 to 100
  startedAt: string;
  completedAt?: string;
  error?: string;
}
