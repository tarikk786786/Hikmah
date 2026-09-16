import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from '../core/tasks/task-manager.js';
import { TaskStore } from '../core/tasks/task-store.js';
import { InMemoryQueueProvider } from '../core/queue/queue-provider.js';
import { LeaseManager } from '../core/workers/lease-manager.js';

describe('PRD 06: Task Idempotency Engine', () => {
  let taskManager: TaskManager;
  let store: TaskStore;

  beforeEach(() => {
    store = new TaskStore();
    store.clear();
    const queue = new InMemoryQueueProvider();
    const leaseManager = new LeaseManager();
    leaseManager.clear();
    taskManager = new TaskManager(store, queue, leaseManager);
  });

  it('should return existing task when called with identical idempotencyKey', async () => {
    const key = 'upload_github_commit_9824';

    const task1 = await taskManager.createTask({
      title: 'Upload Commit to GitHub',
      type: 'CODING',
      input: { repo: 'hikmah', sha: 'abc1234' },
      idempotencyKey: key
    });

    // Simulate second submission (e.g. user double click or network retry)
    const task2 = await taskManager.createTask({
      title: 'Upload Commit to GitHub',
      type: 'CODING',
      input: { repo: 'hikmah', sha: 'abc1234' },
      idempotencyKey: key
    });

    expect(task1.id).toBe(task2.id);
    const allTasks = await store.listTasks();
    expect(allTasks.length).toBe(1);
  });
});
