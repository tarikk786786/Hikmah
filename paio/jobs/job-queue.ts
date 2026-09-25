/**
 * Hikmah Background Job Queue (BullMQ Wrapper)
 * Asynchronous execution for long-running agents (LangGraph, OpenHands).
 */
import { AISystemBus } from '../events/ai-system-bus.js';

export interface JobDefinition {
  id: string;
  name: string;
  payload: any;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  status: 'queued' | 'active' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: any;
}

export type JobHandler = (job: JobDefinition) => Promise<any>;

export class JobQueue {
  private static instance: JobQueue;
  private queue: Map<string, JobDefinition> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private bus = AISystemBus.getInstance();
  
  // Concurrency controls
  private activeJobs = 0;
  private readonly maxConcurrency = 5;

  private constructor() {
    // Start processing loop in background
    setInterval(() => this.processNext(), 1000);
  }

  public static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  /**
   * Register a worker function for a specific job name.
   */
  public registerWorker(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
    console.log(`[JobQueue] Registered background worker for: ${name}`);
  }

  /**
   * Enqueue a new job to run in the background.
   */
  public async enqueue(name: string, payload: any, priority: JobDefinition['priority'] = 'normal'): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: JobDefinition = {
      id: jobId,
      name,
      payload,
      priority,
      status: 'queued',
      createdAt: Date.now()
    };
    
    this.queue.set(jobId, job);
    
    this.bus.emit({
      type: 'job.enqueued',
      source: 'JobQueue',
      data: { jobId, name, priority }
    });

    console.log(`[JobQueue] Job Enqueued: ${jobId} (${name})`);
    return jobId;
  }

  /**
   * Get the current status of a job.
   */
  public getJob(jobId: string): JobDefinition | undefined {
    return this.queue.get(jobId);
  }

  /**
   * List all jobs in the queue.
   */
  public listJobs(): JobDefinition[] {
    return Array.from(this.queue.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Internal processing loop. Grabs queued jobs and executes them.
   */
  private async processNext(): Promise<void> {
    if (this.activeJobs >= this.maxConcurrency) return;

    // Find highest priority queued job
    const queuedJobs = Array.from(this.queue.values()).filter(j => j.status === 'queued');
    if (queuedJobs.length === 0) return;

    // Simple priority sorting (critical first, then chronological)
    const priorityWeight = { 'critical': 4, 'high': 3, 'normal': 2, 'low': 1 };
    queuedJobs.sort((a, b) => {
      const pA = priorityWeight[a.priority || 'normal'];
      const pB = priorityWeight[b.priority || 'normal'];
      if (pA !== pB) return pB - pA;
      return a.createdAt - b.createdAt;
    });

    const job = queuedJobs[0];
    const handler = this.handlers.get(job.name);

    if (!handler) {
      job.status = 'failed';
      job.error = `No worker registered for job type: ${job.name}`;
      return;
    }

    // Execute job
    job.status = 'active';
    job.startedAt = Date.now();
    this.activeJobs++;
    
    this.bus.emit({
      type: 'job.started',
      source: 'JobQueue',
      data: { jobId: job.id, name: job.name }
    });

    try {
      const result = await handler(job);
      job.status = 'completed';
      job.result = result;
      job.completedAt = Date.now();
      
      this.bus.emit({
        type: 'job.completed',
        source: 'JobQueue',
        data: { jobId: job.id, name: job.name }
      });
      console.log(`[JobQueue] Job Completed: ${job.id}`);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message || 'Unknown error';
      job.completedAt = Date.now();
      
      this.bus.emit({
        type: 'job.failed',
        source: 'JobQueue',
        data: { jobId: job.id, name: job.name, error: job.error }
      });
      console.error(`[JobQueue] Job Failed: ${job.id}`, error);
    } finally {
      this.activeJobs--;
    }
  }
}
