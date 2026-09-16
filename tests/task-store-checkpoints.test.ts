import { describe, it, expect, beforeEach } from 'vitest';
import { TaskStore } from '../core/tasks/task-store.js';
import { Task } from '../core/tasks/types.js';

describe('PRD 06: TaskStore & Durable Checkpointing', () => {
  let store: TaskStore;

  beforeEach(() => {
    store = new TaskStore();
    store.clear();
  });

  it('should persist and retrieve tasks with metadata', async () => {
    const task: Task = {
      id: 'task_test_01',
      userId: 'usr_tarik',
      type: 'RESEARCH',
      title: 'Quantum Algorithms',
      input: { query: 'Grover search' },
      status: 'CREATED',
      priority: 'HIGH',
      riskLevel: 'LOW',
      requiresApproval: false,
      approvalStatus: 'NONE',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      retryDelayMs: 1000,
      backoffStrategy: 'EXPONENTIAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await store.createTask(task);
    const retrieved = await store.getTask('task_test_01');
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Quantum Algorithms');
    expect(retrieved?.priority).toBe('HIGH');
  });

  it('should save checkpoints and update task progress automatically', async () => {
    const task: Task = {
      id: 'task_test_02',
      userId: 'usr_tarik',
      type: 'DOCUMENT',
      title: 'PDF Extractor',
      input: { file: 'paper.pdf' },
      status: 'RUNNING',
      priority: 'NORMAL',
      riskLevel: 'LOW',
      requiresApproval: false,
      approvalStatus: 'NONE',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      retryDelayMs: 1000,
      backoffStrategy: 'EXPONENTIAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await store.createTask(task);

    // Save checkpoint 1
    await store.saveCheckpoint({
      id: 'cp_01',
      taskId: 'task_test_02',
      stepId: 'step_ocr',
      state: { pagesExtracted: 5 },
      progress: 50,
      timestamp: new Date().toISOString()
    });

    let updatedTask = await store.getTask('task_test_02');
    expect(updatedTask?.progress).toBe(50);
    expect(updatedTask?.currentStep).toBe('step_ocr');

    // Save checkpoint 2
    await store.saveCheckpoint({
      id: 'cp_02',
      taskId: 'task_test_02',
      stepId: 'step_vectorize',
      state: { vectorsStored: 200 },
      progress: 90,
      timestamp: new Date().toISOString()
    });

    updatedTask = await store.getTask('task_test_02');
    expect(updatedTask?.progress).toBe(90);

    const latest = await store.getLatestCheckpoint('task_test_02');
    expect(latest?.id).toBe('cp_02');
    expect(latest?.stepId).toBe('step_vectorize');

    const all = await store.listCheckpoints('task_test_02');
    expect(all.length).toBe(2);
  });
});
