import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../core/tasks/task-manager.js';
import { TaskStore } from '../core/tasks/task-store.js';
import { InMemoryQueueProvider } from '../core/queue/queue-provider.js';
import { LeaseManager } from '../core/workers/lease-manager.js';
import { DurableWorker } from '../core/workers/durable-worker.js';
import { Task, TaskResult } from '../core/tasks/types.js';

class FlakyWorker extends DurableWorker {
  public attempts = 0;
  public failUntilAttempt = 999; // fail permanently by default

  constructor(queue: InMemoryQueueProvider, store: TaskStore, leaseManager: LeaseManager) {
    super(
      {
        workerId: 'worker_flaky',
        workerType: 'GENERAL',
        leaseDurationMs: 5000,
        heartbeatIntervalMs: 2000
      },
      store,
      queue,
      leaseManager
    );
  }

  public async executeWork(_task: Task): Promise<TaskResult> {
    this.attempts++;
    if (this.attempts <= this.failUntilAttempt) {
      throw new Error(`Simulated transient error attempt ${this.attempts}`);
    }
    return { status: 'SUCCESS', summary: 'Work succeeded after retries' };
  }
}

describe('PRD 06: Bounded Retries & Dead-Letter Handling', () => {
  let store: TaskStore;
  let queue: InMemoryQueueProvider;
  let leaseManager: LeaseManager;
  let taskManager: TaskManager;

  beforeEach(() => {
    store = new TaskStore();
    store.clear();
    queue = new InMemoryQueueProvider();
    leaseManager = new LeaseManager();
    leaseManager.clear();
    taskManager = new TaskManager(store, queue, leaseManager);
  });

  it('should transition to FAILED when max retries are exhausted', async () => {
    const task = await taskManager.createTask({
      title: 'Flaky Network Job',
      type: 'GENERAL',
      input: { url: 'https://example.com' },
      maxRetries: 2,
      retryDelayMs: 10
    });

    const worker = new FlakyWorker(queue, store, leaseManager);

    // Attempt 1: fails -> RETRYING
    await expect(worker.processTask(task.id)).rejects.toThrow();
    let updated = await store.getTask(task.id);
    expect(updated?.status).toBe('RETRYING');
    expect(updated?.retryCount).toBe(1);

    // Attempt 2: fails -> RETRYING
    await expect(worker.processTask(task.id)).rejects.toThrow();
    updated = await store.getTask(task.id);
    expect(updated?.status).toBe('RETRYING');
    expect(updated?.retryCount).toBe(2);

    // Attempt 3: exceeds maxRetries (2) -> FAILED (Dead Letter)
    await expect(worker.processTask(task.id)).rejects.toThrow();
    updated = await store.getTask(task.id);
    expect(updated?.status).toBe('FAILED');
    expect(updated?.error?.classification).toBe('PERMANENT');
  });

  it('should succeed after retry when error is transient', async () => {
    const task = await taskManager.createTask({
      title: 'Eventual Success Job',
      type: 'GENERAL',
      input: { url: 'https://example.com' },
      maxRetries: 3,
      retryDelayMs: 10
    });

    const worker = new FlakyWorker(queue, store, leaseManager);
    worker.failUntilAttempt = 1; // Fails on 1st attempt, succeeds on 2nd

    // Attempt 1 fails
    await expect(worker.processTask(task.id)).rejects.toThrow();
    expect((await store.getTask(task.id))?.status).toBe('RETRYING');

    // Attempt 2 succeeds
    const result = await worker.processTask(task.id);
    expect(result.status).toBe('SUCCESS');
    expect((await store.getTask(task.id))?.status).toBe('SUCCEEDED');
  });
});
