import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowEngine } from '../core/workflows/workflow-engine.js';
import { TaskManager } from '../core/tasks/task-manager.js';
import { TaskStore } from '../core/tasks/task-store.js';
import { InMemoryQueueProvider } from '../core/queue/queue-provider.js';
import { LeaseManager } from '../core/workers/lease-manager.js';

describe('PRD 06: WorkflowEngine DAG Step Resolution', () => {
  let store: TaskStore;
  let queue: InMemoryQueueProvider;
  let taskManager: TaskManager;
  let engine: WorkflowEngine;

  beforeEach(() => {
    store = new TaskStore();
    store.clear();
    queue = new InMemoryQueueProvider();
    const leaseManager = new LeaseManager();
    leaseManager.clear();
    taskManager = new TaskManager(store, queue, leaseManager);
    engine = new WorkflowEngine(taskManager, store);
  });

  it('should seed default workflows and list them', () => {
    const list = engine.listWorkflows();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((w) => w.id === 'wf_research_deep')).toBe(true);
  });

  it('should start a workflow run and schedule initial dependency-free steps', async () => {
    const run = await engine.startRun('wf_research_deep', { topic: 'Autonomous Agents' });
    expect(run.status).toBe('RUNNING');
    expect(run.stepStates['step_search']).toBe('RUNNING');
    expect(run.stepStates['step_fetch']).toBe('PENDING'); // dependent on step_search
  });

  it('should advance workflow when dependent step completes', async () => {
    const run = await engine.startRun('wf_research_deep', { topic: 'Autonomous Agents' });
    const searchTaskId = run.stepTasks['step_search'];
    expect(searchTaskId).toBeDefined();

    // Mark step_search as SUCCEEDED in TaskStore
    await store.updateTask(searchTaskId, { status: 'SUCCEEDED' });

    // Advance workflow
    const updatedRun = await engine.advance(run.id);
    expect(updatedRun.stepStates['step_search']).toBe('SUCCEEDED');
    // step_fetch should now have been triggered and set to RUNNING
    expect(updatedRun.stepStates['step_fetch']).toBe('RUNNING');
    expect(updatedRun.stepTasks['step_fetch']).toBeDefined();
  });
});
