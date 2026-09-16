import { Task, TaskCheckpoint, TaskResult } from '../tasks/types.js';
import { TaskStore } from '../tasks/task-store.js';
import { TaskStateMachine } from '../tasks/state-machine.js';
import { QueueProvider } from '../queue/queue-provider.js';
import { LeaseManager } from './lease-manager.js';
import { WorkerConfig, WorkerType } from './worker-types.js';
import { EventBus } from '../events/event-bus.js';

export abstract class DurableWorker {
  protected workerId: string;
  protected workerType: WorkerType;
  protected store: TaskStore;
  protected queue: QueueProvider;
  protected leaseManager: LeaseManager;
  protected eventBus: EventBus;
  protected isRunning: boolean = false;
  protected heartbeatIntervalMs: number;
  protected leaseDurationMs: number;
  protected releaseLeaseOnFailure: boolean = true;
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    config: WorkerConfig,
    store?: TaskStore,
    queue?: QueueProvider,
    leaseManager?: LeaseManager,
    eventBus?: EventBus
  ) {
    this.workerId = config.workerId;
    this.workerType = config.workerType;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs || 10000;
    this.leaseDurationMs = config.leaseDurationMs || 30000;
    this.store = store || TaskStore.getInstance();
    this.leaseManager = leaseManager || LeaseManager.getInstance();
    this.eventBus = eventBus || EventBus.getInstance();
    if (!queue) {
      throw new Error('QueueProvider is required for DurableWorker');
    }
    this.queue = queue;
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public getWorkerType(): WorkerType {
    return this.workerType;
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    this.pollLoop();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();
  }

  public async heartbeat(taskId: string): Promise<boolean> {
    const renewed = await this.leaseManager.renewLease(
      taskId,
      this.workerId,
      this.leaseDurationMs
    );
    if (renewed) {
      const task = await this.store.getTask(taskId);
      if (task) {
        await this.store.updateTask(taskId, { updatedAt: new Date().toISOString() });
      }
    }
    return renewed;
  }

  public async checkpoint(
    taskId: string,
    stepId: string,
    progress: number,
    state: Record<string, unknown>,
    partialResult?: unknown,
    cursor?: string
  ): Promise<TaskCheckpoint> {
    const cp: TaskCheckpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      stepId,
      state,
      progress,
      partialResult,
      cursor,
      timestamp: new Date().toISOString()
    };

    const saved = await this.store.saveCheckpoint(cp);
    this.eventBus.emit({
      event: 'TASK_CHECKPOINT' as any,
      riskLevel: 'LOW',
      correlation: { taskId, workerId: this.workerId },
      payload: { taskId, stepId, progress }
    });

    return saved;
  }

  protected startHeartbeat(taskId: string): void {
    if (this.heartbeatTimers.has(taskId)) return;
    const timer = setInterval(() => {
      this.heartbeat(taskId).catch((err) => {
        console.warn(`Worker [${this.workerId}] failed heartbeat for task [${taskId}]:`, err);
      });
    }, this.heartbeatIntervalMs);
    this.heartbeatTimers.set(taskId, timer);
  }

  protected stopHeartbeat(taskId: string): void {
    const timer = this.heartbeatTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(taskId);
    }
  }

  public abstract executeWork(task: Task, checkpoint?: TaskCheckpoint | null): Promise<TaskResult>;

  public async processTask(taskId: string): Promise<TaskResult> {
    // Acquire lease
    const acquired = await this.leaseManager.acquireLease(
      taskId,
      this.workerId,
      this.workerType,
      this.leaseDurationMs
    );

    if (!acquired) {
      throw new Error(`Worker [${this.workerId}] could not acquire lease for task [${taskId}]`);
    }

    this.startHeartbeat(taskId);

    try {
      const task = await this.store.getTask(taskId);
      if (!task) {
        throw new Error(`Task [${taskId}] does not exist`);
      }

      // Check if paused or cancelled
      if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
        return {
          status: 'PARTIAL_SUCCESS',
          summary: `Task in state ${task.status}`
        };
      }

      // Transition to RUNNING
      TaskStateMachine.validateTransition(task.status, 'RUNNING');
      await this.store.updateTask(taskId, {
        status: 'RUNNING',
        assignedWorker: this.workerId,
        startedAt: task.startedAt || new Date().toISOString()
      });

      this.eventBus.emit({
        event: 'JOB_STARTED',
        riskLevel: task.riskLevel,
        correlation: { taskId, userId: task.userId },
        payload: { taskId, workerId: this.workerId, type: task.type }
      });

      // Load latest checkpoint if recovering
      const checkpoint = await this.store.getLatestCheckpoint(taskId);

      // Execute concrete work
      const result = await this.executeWork(task, checkpoint);

      // Transition to SUCCEEDED or PARTIAL
      const finalState = result.status === 'SUCCESS' ? 'SUCCEEDED' : 'PARTIAL';
      TaskStateMachine.validateTransition('RUNNING', finalState);

      await this.store.updateTask(taskId, {
        status: finalState,
        result,
        progress: 100,
        completedAt: new Date().toISOString()
      });

      this.eventBus.emit({
        event: 'TASK_COMPLETED' as any,
        riskLevel: task.riskLevel,
        correlation: { taskId, userId: task.userId },
        payload: { taskId, status: finalState }
      });

      return result;
    } catch (err: unknown) {
      const errorMsg = (err as Error).message;
      const task = await this.store.getTask(taskId);

      if (task) {
        const nextRetry = task.retryCount + 1;
        if (nextRetry <= task.maxRetries) {
          // Retryable
          await this.store.updateTask(taskId, {
            status: 'RETRYING',
            retryCount: nextRetry,
            error: {
              message: errorMsg,
              classification: 'TRANSIENT',
              retryable: true,
              failedAt: new Date().toISOString()
            }
          });
          // Re-enqueue with backoff
          const delay = task.retryDelayMs * Math.pow(2, nextRetry - 1);
          await this.queue.enqueue({
            id: `retry_${taskId}_${nextRetry}`,
            taskId,
            workerType: this.workerType,
            priority: 50,
            payload: task.input,
            enqueuedAt: new Date().toISOString(),
            delayUntil: Date.now() + delay,
            attempts: nextRetry
          });
        } else {
          // Dead-Letter / Permanently Failed
          await this.store.updateTask(taskId, {
            status: 'FAILED',
            error: {
              message: errorMsg,
              classification: 'PERMANENT',
              retryable: false,
              failedAt: new Date().toISOString()
            },
            completedAt: new Date().toISOString()
          });
          this.eventBus.emit({
            event: 'JOB_FAILED',
            riskLevel: task.riskLevel,
            correlation: { taskId, userId: task.userId },
            payload: { taskId, error: errorMsg }
          });
        }
      }
      throw err;
    } finally {
      this.stopHeartbeat(taskId);
      if (this.releaseLeaseOnFailure) {
        await this.leaseManager.releaseLease(taskId, this.workerId);
      }
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const item = await this.queue.dequeue(this.workerType);
        if (item) {
          await this.processTask(item.taskId);
          await this.queue.acknowledge(item.id);
        } else {
          // Sleep briefly before polling again
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}

/**
 * Concrete General Worker for executing tasks and tool calling
 */
export class GeneralWorker extends DurableWorker {
  constructor(
    workerId = 'worker_general_01',
    store?: TaskStore,
    queue?: QueueProvider,
    leaseManager?: LeaseManager,
    eventBus?: EventBus
  ) {
    super(
      {
        workerId,
        workerType: 'GENERAL',
        heartbeatIntervalMs: 5000,
        leaseDurationMs: 15000
      },
      store,
      queue,
      leaseManager,
      eventBus
    );
  }

  public async executeWork(task: Task, checkpoint?: TaskCheckpoint | null): Promise<TaskResult> {
    const startStep = checkpoint ? Number(checkpoint.stepId.replace('step_', '')) + 1 : 1;
    const totalSteps = Number(task.metadata?.totalSteps || 3);

    for (let step = startStep; step <= totalSteps; step++) {
      // Periodic checkpoint
      const progress = Math.round((step / totalSteps) * 100);
      await this.checkpoint(
        task.id,
        `step_${step}`,
        progress,
        { completedSteps: step },
        `Completed step ${step} of ${totalSteps}`
      );
    }

    return {
      status: 'SUCCESS',
      summary: `Successfully completed task [${task.title}] across ${totalSteps} durable steps.`,
      data: { processed: true, stepsExecuted: totalSteps }
    };
  }
}
