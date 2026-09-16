import { AgentLease } from '../core/types.js';

export class AgentLeaseManager {
  private static instance: AgentLeaseManager;
  private leases: Map<string, AgentLease> = new Map(); // resourceId -> AgentLease

  public static getInstance(): AgentLeaseManager {
    if (!AgentLeaseManager.instance) {
      AgentLeaseManager.instance = new AgentLeaseManager();
    }
    return AgentLeaseManager.instance;
  }

  /**
   * Attempts to acquire an exclusive lease on a shared resource
   */
  public acquireLease(
    resourceId: string,
    agentId: string,
    workflowId: string,
    ttlSeconds: number = 300
  ): { acquired: boolean; lease?: AgentLease; reason?: string } {
    const now = new Date();
    const existing = this.leases.get(resourceId);

    // If existing lease is still active and not held by this agent
    if (existing && existing.status === 'ACTIVE') {
      const expires = new Date(existing.expiresAt);
      if (expires > now) {
        if (existing.agentId === agentId) {
          // Re-entrant renewal
          existing.expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
          return { acquired: true, lease: existing };
        }
        return {
          acquired: false,
          reason: `Resource [${resourceId}] is currently locked by agent [${existing.agentId}] until ${existing.expiresAt}`
        };
      }
    }

    // Grant lease
    const lease: AgentLease = {
      leaseId: `lease_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      resourceId,
      agentId,
      workflowId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      status: 'ACTIVE'
    };

    this.leases.set(resourceId, lease);
    return { acquired: true, lease };
  }

  /**
   * Releases an active lease
   */
  public releaseLease(resourceId: string, agentId: string): boolean {
    const existing = this.leases.get(resourceId);
    if (!existing) return true;

    if (existing.agentId === agentId || new Date(existing.expiresAt) <= new Date()) {
      existing.status = 'RELEASED';
      this.leases.delete(resourceId);
      return true;
    }

    return false;
  }

  public isLocked(resourceId: string): boolean {
    const existing = this.leases.get(resourceId);
    if (!existing || existing.status !== 'ACTIVE') return false;
    return new Date(existing.expiresAt) > new Date();
  }

  public getActiveLeases(): AgentLease[] {
    const now = new Date();
    return Array.from(this.leases.values()).filter(l => l.status === 'ACTIVE' && new Date(l.expiresAt) > now);
  }
}
