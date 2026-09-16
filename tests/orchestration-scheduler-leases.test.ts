import { describe, it, expect } from 'vitest';
import { PriorityScheduler } from '../orchestration/scheduler/priority-scheduler.js';
import { AgentLeaseManager } from '../orchestration/leases/agent-lease-manager.js';
import { AgentPriority } from '../orchestration/core/types.js';

describe('PRD 20: Priority Scheduler & Agent Lease Manager', () => {
  it('should enqueue and prioritize tasks based on priority tiers and aging', () => {
    const scheduler = new PriorityScheduler({ maxConcurrency: 2, enableAging: true });

    scheduler.enqueue({
      taskId: 'task_low',
      workflowId: 'run_1',
      objective: 'Low Priority Task',
      agentType: 'researcher',
      capability: 'research',
      dependencies: [],
      status: 'pending',
      inputs: {},
      priority: 'LOW',
      resourceLimits: {},
      retries: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString()
    });

    scheduler.enqueue({
      taskId: 'task_critical',
      workflowId: 'run_1',
      objective: 'Critical Task',
      agentType: 'security',
      capability: 'security',
      dependencies: [],
      status: 'pending',
      inputs: {},
      priority: 'CRITICAL',
      resourceLimits: {},
      retries: 0,
      maxRetries: 2,
      createdAt: new Date().toISOString()
    });

    const nextTask = scheduler.dequeue();
    expect(nextTask).toBeDefined();
    expect(nextTask?.taskId).toBe('task_critical');
  });

  it('should acquire, enforce exclusivity, and release distributed resource leases', async () => {
    const leaseManager = new AgentLeaseManager();

    // 1. Acquire exclusive lock on repository
    const lease1 = leaseManager.acquireLease(
      'repo:hikmah-core',
      'agent_coder_1',
      'run_100',
      300
    );

    expect(lease1.acquired).toBe(true);
    expect(lease1.lease?.leaseId).toBeDefined();

    // 2. Second agent tries to acquire conflicting exclusive lock
    const lease2 = leaseManager.acquireLease(
      'repo:hikmah-core',
      'agent_coder_2',
      'run_101',
      300
    );

    expect(lease2.acquired).toBe(false);
    expect(lease2.reason).toMatch(/currently locked/);

    // 3. Release first lock
    const released = leaseManager.releaseLease('repo:hikmah-core', 'agent_coder_1');
    expect(released).toBe(true);

    // 4. Now second agent can acquire lock
    const lease3 = leaseManager.acquireLease(
      'repo:hikmah-core',
      'agent_coder_2',
      'run_101',
      300
    );

    expect(lease3.acquired).toBe(true);
  });
});

