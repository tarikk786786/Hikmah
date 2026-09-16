import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../core/tasks/task-manager.js';
import { TaskStore } from '../core/tasks/task-store.js';
import { InMemoryQueueProvider } from '../core/queue/queue-provider.js';
import { LeaseManager } from '../core/workers/lease-manager.js';
import { DurableWorker } from '../core/workers/durable-worker.js';
import { Task, TaskCheckpoint, TaskResult } from '../core/tasks/types.js';

// Worker that simulates crashing midway
class CrashingWorker extends DurableWorker {
  public executedSteps: number[] = [];

  constructor(
    workerId: string,
    queue: InMemoryQueueProvider,
    store: TaskStore,
    leaseManager: LeaseManager,
    leaseDurationMs = 100 // short lease for fast testing
  ) {
    super(
      {
        workerId,
        workerType: 'RESEARCH',
        heartbeatIntervalMs: 50,
        leaseDurationMs
      },
      store,
      queue,
      leaseManager
    );
    this.releaseLeaseOnFailure = false;
  }

  public async executeWork(task: Task, checkpoint?: TaskCheckpoint | null): Promise<TaskResult> {
    const startStep = checkpoint ? Number(checkpoint.stepId.replace('step_', '')) + 1 : 1;
    const totalSteps = 5;

    for (let step = startStep; step <= totalSteps; step++) {
      this.executedSteps.push(step);

      // Checkpoint progress
      const progress = Math.round((step / totalSteps) * 100);
      await this.checkpoint(
        task.id,
        `step_${step}`,
        progress,
        { completedSteps: step },
        `Completed research step ${step} of ${totalSteps}`
      );

      // Crash condition: Worker 1 crashes right after completing step 2
      if (this.workerId === 'worker_crasher' && step === 2) {
        // Stop heartbeats and throw a fatal termination error
        this.stop();
        throw new Error('FATAL: Worker crashed / SIGKILL simulated');
      }
    }

    return {
      status: 'SUCCESS',
      summary: `Successfully completed research across all ${totalSteps} steps.`
    };
  }
}

describe('PRD 06: MANDATORY ACCEPTANCE TEST - Worker Crash & Checkpoint Recovery', () => {
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

  it('should recover crashed worker task from checkpoint and complete without restarting from step 1', async () => {
    // 1. User starts a 5-step research task
    const task = await taskManager.createTask({
      title: 'Durable Multi-Step Research Task',
      type: 'RESEARCH',
      input: { topic: 'Distributed Recovery' },
      maxRetries: 3
    });
    expect(task.status).toBe('QUEUED');

    // 2. Worker 1 (Crasher) claims task and runs with 100ms lease
    const worker1 = new CrashingWorker('worker_crasher', queue, store, leaseManager, 100);

    // Worker 1 runs and crashes at step 2
    await expect(worker1.processTask(task.id)).rejects.toThrow(/FATAL: Worker crashed/);

    // Verify Worker 1 executed only steps 1 and 2
    expect(worker1.executedSteps).toEqual([1, 2]);

    // Verify checkpoint at step 2 exists
    const latestCheckpoint = await store.getLatestCheckpoint(task.id);
    expect(latestCheckpoint).toBeDefined();
    expect(latestCheckpoint?.stepId).toBe('step_2');
    expect(latestCheckpoint?.progress).toBe(40);

    // 3. Wait 120ms for Worker 1's lease to expire
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Verify lease has expired
    const expiredLeases = leaseManager.getExpiredLeases();
    expect(expiredLeases.some((l) => l.taskId === task.id)).toBe(true);

    // 4. Sweeper detects stale lease, recovers task, and re-enqueues
    // Note: in this crash scenario, status was set to RETRYING or RUNNING.
    // Let's set status to RUNNING to simulate an unhandled sudden termination / process death
    await store.updateTask(task.id, { status: 'RUNNING' });
    const recovered = await taskManager.checkStaleTasksAndRecover();
    expect(recovered.some((t) => t.id === task.id)).toBe(true);

    // 5. Worker 2 (Recovery Worker) claims recovered task
    const worker2 = new CrashingWorker('worker_recovered_02', queue, store, leaseManager, 5000);

    // Worker 2 processes the task
    const finalResult = await worker2.processTask(task.id);

    // Worker 2 must have resumed from step 3 (i.e. executed steps 3, 4, 5 only!)
    expect(worker2.executedSteps).toEqual([3, 4, 5]);

    // 6. Result is stored and status is SUCCEEDED
    expect(finalResult.status).toBe('SUCCESS');

    const finalTaskState = await store.getTask(task.id);
    expect(finalTaskState?.status).toBe('SUCCEEDED');
    expect(finalTaskState?.progress).toBe(100);
    expect(finalTaskState?.currentStep).toBe('step_5');
  });
});
