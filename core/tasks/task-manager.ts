import { v4 as uuidv4 } from 'uuid';
import { CreateTaskInput, Task, TaskFilter } from './types.js';
import { TaskStore } from './task-store.js';
import { TaskStateMachine } from './state-machine.js';
import { QueueProvider, InMemoryQueueProvider } from '../queue/queue-provider.js';
import { LeaseManager } from '../workers/lease-manager.js';
import { EventBus } from '../events/event-bus.js';
import { SafetyClassifier } from '../safety/classifier.js';

export class TaskManager {
  private static instance: TaskManager;
  private store: TaskStore;
  private queue: QueueProvider;
  private leaseManager: LeaseManager;
  private eventBus: EventBus;
  private safety: SafetyClassifier;

  constructor(
    store?: TaskStore,
    queue?: QueueProvider,
    leaseManager?: LeaseManager,
    eventBus?: EventBus,
    safety?: SafetyClassifier
  ) {
    this.store = store || TaskStore.getInstance();
    this.queue = queue || new InMemoryQueueProvider();
    this.leaseManager = leaseManager || LeaseManager.getInstance();
    this.eventBus = eventBus || EventBus.getInstance();
    this.safety = safety || new SafetyClassifier();
  }

  public static getInstance(
    store?: TaskStore,
    queue?: QueueProvider,
    leaseManager?: LeaseManager,
    eventBus?: EventBus
  ): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager(store, queue, leaseManager, eventBus);
    }
    return TaskManager.instance;
  }

  public getStore(): TaskStore {
    return this.store;
  }

  public getQueue(): QueueProvider {
    return this.queue;
  }

  public getLeaseManager(): LeaseManager {
    return this.leaseManager;
  }

  public async createTask(input: CreateTaskInput): Promise<Task> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await this.store.getTaskByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const taskId = `task_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    // 2. Risk & Approval Evaluation
    const riskLevel = input.riskLevel || 'LOW';
    const requiresApproval = input.requiresApproval ?? (riskLevel === 'CRITICAL' || riskLevel === 'HIGH');
    const initialStatus = requiresApproval ? 'WAITING_APPROVAL' : 'QUEUED';

    const task: Task = {
      id: taskId,
      userId: input.userId || 'usr_default',
      projectId: input.projectId,
      parentTaskId: input.parentTaskId,
      workflowId: input.workflowId,
      type: input.type,
      title: input.title,
      description: input.description,
      input: input.input,
      status: initialStatus,
      priority: input.priority || 'NORMAL',
      riskLevel,
      requiresApproval,
      approvalStatus: requiresApproval ? 'PENDING' : 'NONE',
      progress: 0,
      retryCount: 0,
      maxRetries: input.maxRetries ?? 3,
      retryDelayMs: input.retryDelayMs ?? 1000,
      backoffStrategy: input.backoffStrategy || 'EXPONENTIAL',
      createdAt: now,
      updatedAt: now,
      deadline: input.deadline,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata
    };

    // 3. Persist in Store
    const saved = await this.store.createTask(task);

    this.eventBus.emit({
      event: 'REQUEST_CREATED',
      riskLevel,
      correlation: { taskId, userId: task.userId },
      payload: { taskId, title: task.title, type: task.type }
    });

    // 4. Enqueue if ready
    if (initialStatus === 'QUEUED') {
      await this.enqueueTask(saved);
    } else {
      this.eventBus.emit({
        event: 'APPROVAL_REQUIRED',
        riskLevel,
        correlation: { taskId, userId: task.userId },
        payload: { taskId, reason: 'High-risk or explicit approval policy' }
      });
    }

    return saved;
  }

  private async enqueueTask(task: Task, delayMs = 0): Promise<void> {
    const priorityScore = {
      CRITICAL: 100,
      HIGH: 75,
      NORMAL: 50,
      LOW: 25,
      BACKGROUND: 10
    }[task.priority] || 50;

    await this.queue.enqueue({
      id: `q_${task.id}`,
      taskId: task.id,
      workerType: task.type,
      priority: priorityScore,
      payload: task.input,
      enqueuedAt: new Date().toISOString(),
      delayUntil: delayMs > 0 ? Date.now() + delayMs : undefined,
      attempts: task.retryCount
    });

    this.eventBus.emit({
      event: 'TASK_QUEUED' as any,
      riskLevel: task.riskLevel,
      correlation: { taskId: task.id, userId: task.userId },
      payload: { taskId: task.id, priority: task.priority }
    });
  }

  public async getTask(taskId: string): Promise<Task | null> {
    return this.store.getTask(taskId);
  }

  public async listTasks(filter?: TaskFilter): Promise<Task[]> {
    return this.store.listTasks(filter);
  }

  public async pauseTask(taskId: string): Promise<Task> {
    const task = await this.store.getTask(taskId);
    if (!task) throw new Error(`Task [${taskId}] not found`);

    TaskStateMachine.validateTransition(task.status, 'PAUSED');
    const updated = await this.store.updateTask(taskId, { status: 'PAUSED' });

    // Remove from active queue if queued
    await this.queue.cancel(`q_${taskId}`);
    return updated;
  }

  public async resumeTask(taskId: string): Promise<Task> {
    const task = await this.store.getTask(taskId);
    if (!task) throw new Error(`Task [${taskId}] not found`);

    TaskStateMachine.validateTransition(task.status, 'QUEUED');
    const updated = await this.store.updateTask(taskId, { status: 'QUEUED' });
    await this.enqueueTask(updated);
    return updated;
  }

  public async cancelTask(taskId: string, reason?: string): Promise<Task> {
    const task = await this.store.getTask(taskId);
    if (!task) throw new Error(`Task [${taskId}] not found`);

    TaskStateMachine.validateTransition(task.status, 'CANCELLED');
    const updated = await this.store.updateTask(taskId, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      metadata: { ...task.metadata, cancellationReason: reason }
    });

    await this.queue.cancel(`q_${taskId}`);
    if (task.assignedWorker) {
      await this.leaseManager.releaseLease(taskId, task.assignedWorker);
    }

    this.eventBus.emit({
      event: 'JOB_CANCELLED',
      riskLevel: task.riskLevel,
      correlation: { taskId, userId: task.userId },
      payload: { taskId, reason }
    });

    return updated;
  }

  public async retryTask(taskId: string): Promise<Task> {
    const task = await this.store.getTask(taskId);
    if (!task) throw new Error(`Task [${taskId}] not found`);

    TaskStateMachine.validateTransition(task.status, 'QUEUED');
    const updated = await this.store.updateTask(taskId, {
      status: 'QUEUED',
      error: undefined
    });

    await this.enqueueTask(updated);
    return updated;
  }

  public async approveTask(
    taskId: string,
    approvedBy: string,
    decision: 'APPROVED' | 'DENIED',
    reason?: string
  ): Promise<Task> {
    const task = await this.store.getTask(taskId);
    if (!task) throw new Error(`Task [${taskId}] not found`);

    if (task.status !== 'WAITING_APPROVAL') {
      throw new Error(`Task [${taskId}] is not awaiting approval (current state: ${task.status})`);
    }

    if (decision === 'APPROVED') {
      TaskStateMachine.validateTransition('WAITING_APPROVAL', 'QUEUED');
      const updated = await this.store.updateTask(taskId, {
        status: 'QUEUED',
        approvalStatus: 'APPROVED',
        metadata: { ...task.metadata, approvedBy, approvedAt: new Date().toISOString(), reason }
      });
      await this.enqueueTask(updated);

      this.eventBus.emit({
        event: 'APPROVAL_GRANTED',
        riskLevel: task.riskLevel,
        correlation: { taskId, userId: task.userId },
        payload: { taskId, approvedBy }
      });

      return updated;
    } else {
      TaskStateMachine.validateTransition('WAITING_APPROVAL', 'CANCELLED');
      const updated = await this.store.updateTask(taskId, {
        status: 'CANCELLED',
        approvalStatus: 'DENIED',
        cancelledAt: new Date().toISOString(),
        metadata: { ...task.metadata, deniedBy: approvedBy, deniedReason: reason }
      });

      this.eventBus.emit({
        event: 'APPROVAL_DENIED',
        riskLevel: task.riskLevel,
        correlation: { taskId, userId: task.userId },
        payload: { taskId, approvedBy, reason }
      });

      return updated;
    }
  }

  /**
   * Stale task recovery sweeper:
   * Inspects tasks with expired leases or missing heartbeats,
   * restores their state from the latest checkpoint, and re-enqueues continuation.
   */
  public async checkStaleTasksAndRecover(): Promise<Task[]> {
    const expiredLeases = this.leaseManager.getExpiredLeases();
    const recoveredTasks: Task[] = [];

    for (const lease of expiredLeases) {
      const task = await this.store.getTask(lease.taskId);
      if (!task) continue;

      if (task.status === 'RUNNING') {
        console.warn(`[RECOVERY] Stale lease detected on task [${task.id}]. Worker [${lease.workerId}] timed out.`);

        // Release stale lease
        await this.leaseManager.releaseLease(task.id, lease.workerId);

        // Check latest checkpoint
        const latestCheckpoint = await this.store.getLatestCheckpoint(task.id);
        const retryCount = task.retryCount + 1;

        if (retryCount <= task.maxRetries) {
          const updated = await this.store.updateTask(task.id, {
            status: 'QUEUED',
            retryCount,
            assignedWorker: undefined,
            metadata: {
              ...task.metadata,
              recoveredFromLease: lease.workerId,
              resumedFromStep: latestCheckpoint?.stepId
            }
          });

          await this.enqueueTask(updated);
          recoveredTasks.push(updated);

          this.eventBus.emit({
            event: 'TASK_RETRYING' as any,
            riskLevel: task.riskLevel,
            correlation: { taskId: task.id },
            payload: {
              taskId: task.id,
              recoveredStep: latestCheckpoint?.stepId,
              retryCount
            }
          });
        } else {
          // Exceeded retries -> FAILED
          const failed = await this.store.updateTask(task.id, {
            status: 'FAILED',
            error: {
              message: `Task failed: Worker [${lease.workerId}] lease expired and max retries exceeded.`,
              classification: 'TIMEOUT',
              retryable: false,
              failedAt: new Date().toISOString()
            }
          });
          recoveredTasks.push(failed);
        }
      }
    }

    return recoveredTasks;
  }
}
