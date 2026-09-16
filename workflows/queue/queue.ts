import { v4 as uuidv4 } from 'uuid';
import { JobTask, JobType, JobWorkerHandler } from './types.js';

export class TaskQueue {
  private inMemoryQueue: JobTask[] = [];
  private handlers: Map<JobType, JobWorkerHandler> = new Map();
  private isProcessing: boolean = false;
  private redisUrl?: string;

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl || process.env.REDIS_URL;
  }

  public async enqueue<T = Record<string, unknown>>(
    type: JobType,
    payload: T,
    userId: string = 'usr_default',
    priority: number = 5
  ): Promise<JobTask<T>> {
    const job: JobTask<T> = {
      id: `job_${uuidv4().substring(0, 8)}`,
      type,
      priority,
      payload,
      userId,
      status: 'queued',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString()
    };

    this.inMemoryQueue.push(job as JobTask);
    // Sort descending by priority
    this.inMemoryQueue.sort((a, b) => b.priority - a.priority);

    // Trigger asynchronous queue processor
    this.processNextJobs();

    return job;
  }

  public registerHandler(type: JobType, handler: JobWorkerHandler): void {
    this.handlers.set(type, handler);
  }

  public getQueueLength(): number {
    return this.inMemoryQueue.filter(j => j.status === 'queued').length;
  }

  public getJob(id: string): JobTask | undefined {
    return this.inMemoryQueue.find(j => j.id === id);
  }

  public listJobs(): JobTask[] {
    return [...this.inMemoryQueue];
  }

  private async processNextJobs(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const nextJob = this.inMemoryQueue.find(j => j.status === 'queued');
        if (!nextJob) break;

        const handler = this.handlers.get(nextJob.type);
        if (!handler) {
          // No worker registered yet for this task type; leave queued
          break;
        }

        nextJob.status = 'processing';
        nextJob.startedAt = new Date().toISOString();

        try {
          const result = await handler(nextJob);
          nextJob.status = 'completed';
          nextJob.result = result;
          nextJob.completedAt = new Date().toISOString();
        } catch (err: unknown) {
          nextJob.retryCount++;
          if (nextJob.retryCount >= nextJob.maxRetries) {
            nextJob.status = 'failed';
            nextJob.error = (err as Error).message;
            nextJob.completedAt = new Date().toISOString();
          } else {
            nextJob.status = 'queued'; // retry
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
