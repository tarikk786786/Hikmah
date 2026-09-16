export type JobType =
  | 'agent_task'
  | 'research_task'
  | 'browser_task'
  | 'document_task'
  | 'scheduled_task'
  | 'notification_task';

export interface JobTask<T = Record<string, unknown>> {
  id: string;
  type: JobType;
  priority: number; // 1 (lowest) to 10 (highest)
  payload: T;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export interface JobWorkerHandler<T = Record<string, unknown>> {
  (job: JobTask<T>): Promise<unknown>;
}
