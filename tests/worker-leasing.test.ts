import { describe, it, expect, beforeEach } from 'vitest';
import { LeaseManager } from '../core/workers/lease-manager.js';

describe('PRD 06: Distributed Worker Leasing & Heartbeats', () => {
  let leaseManager: LeaseManager;

  beforeEach(() => {
    leaseManager = new LeaseManager();
    leaseManager.clear();
  });

  it('should acquire lease and prevent second worker from claiming same task', async () => {
    const acquired1 = await leaseManager.acquireLease('task_100', 'worker_A', 'GENERAL', 5000);
    expect(acquired1).toBe(true);

    // Second worker attempts to acquire same task while lease is active
    const acquired2 = await leaseManager.acquireLease('task_100', 'worker_B', 'GENERAL', 5000);
    expect(acquired2).toBe(false);

    const lease = leaseManager.getLease('task_100');
    expect(lease?.workerId).toBe('worker_A');
  });

  it('should allow worker to renew its own lease via heartbeat', async () => {
    await leaseManager.acquireLease('task_200', 'worker_A', 'GENERAL', 1000);
    const leaseBefore = leaseManager.getLease('task_200');

    // Wait 50ms
    await new Promise((resolve) => setTimeout(resolve, 50));

    const renewed = await leaseManager.renewLease('task_200', 'worker_A', 2000);
    expect(renewed).toBe(true);

    const leaseAfter = leaseManager.getLease('task_200');
    expect(leaseAfter!.leaseExpiresAt).toBeGreaterThan(leaseBefore!.leaseExpiresAt);
  });

  it('should detect expired leases and allow recovery by a new worker', async () => {
    // Short lease (100ms)
    await leaseManager.acquireLease('task_300', 'worker_A', 'GENERAL', 100);

    // Wait 120ms for expiration
    await new Promise((resolve) => setTimeout(resolve, 120));

    const expired = leaseManager.getExpiredLeases();
    expect(expired.some((l) => l.taskId === 'task_300')).toBe(true);

    // Worker B should now be able to claim task_300
    const acquiredB = await leaseManager.acquireLease('task_300', 'worker_B', 'GENERAL', 5000);
    expect(acquiredB).toBe(true);

    const activeLease = leaseManager.getLease('task_300');
    expect(activeLease?.workerId).toBe('worker_B');
  });
});
