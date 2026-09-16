import { WorkerLease, WorkerType } from './worker-types.js';

export class LeaseManager {
  private static instance: LeaseManager;
  private leases: Map<string, WorkerLease> = new Map(); // taskId -> WorkerLease

  public static getInstance(): LeaseManager {
    if (!LeaseManager.instance) {
      LeaseManager.instance = new LeaseManager();
    }
    return LeaseManager.instance;
  }

  public async acquireLease(
    taskId: string,
    workerId: string,
    workerType: WorkerType,
    durationMs: number = 30000
  ): Promise<boolean> {
    const now = Date.now();
    const existing = this.leases.get(taskId);

    if (existing) {
      // Check if lease has expired
      if (now <= existing.leaseExpiresAt && existing.workerId !== workerId) {
        // Active lease held by another worker
        return false;
      }
    }

    // Acquire or re-claim expired lease
    const lease: WorkerLease = {
      taskId,
      workerId,
      workerType,
      leaseAcquiredAt: now,
      leaseExpiresAt: now + durationMs,
      heartbeatAt: now
    };

    this.leases.set(taskId, lease);
    return true;
  }

  public async renewLease(
    taskId: string,
    workerId: string,
    durationMs: number = 30000
  ): Promise<boolean> {
    const now = Date.now();
    const existing = this.leases.get(taskId);

    if (!existing || existing.workerId !== workerId) {
      return false;
    }

    existing.leaseExpiresAt = now + durationMs;
    existing.heartbeatAt = now;
    return true;
  }

  public async releaseLease(taskId: string, workerId: string): Promise<boolean> {
    const existing = this.leases.get(taskId);
    if (!existing) return true;

    if (existing.workerId === workerId) {
      this.leases.delete(taskId);
      return true;
    }

    return false;
  }

  public getLease(taskId: string): WorkerLease | null {
    const lease = this.leases.get(taskId);
    return lease ? { ...lease } : null;
  }

  public getExpiredLeases(): WorkerLease[] {
    const now = Date.now();
    return Array.from(this.leases.values())
      .filter((l) => l.leaseExpiresAt < now)
      .map((l) => ({ ...l }));
  }

  public getAllLeases(): WorkerLease[] {
    return Array.from(this.leases.values()).map((l) => ({ ...l }));
  }

  public clear(): void {
    this.leases.clear();
  }
}
