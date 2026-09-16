import { v4 as uuidv4 } from 'uuid';

export interface SecurityEventRecord {
  id: string;
  timestamp: string;
  target: string;
  action: string;
  authorizationId?: string;
  authorized: boolean;
  operatorId: string;
  rationale: string;
  evidenceHash?: string;
  payloadSummary: Record<string, unknown>;
}

export class SecurityAuditLog {
  private static events: SecurityEventRecord[] = [];

  public static record(event: Omit<SecurityEventRecord, 'id' | 'timestamp'>): SecurityEventRecord {
    const entry: SecurityEventRecord = {
      ...event,
      id: `sec_ev_${uuidv4().substring(0, 8)}`,
      timestamp: new Date().toISOString()
    };

    SecurityAuditLog.events.unshift(entry);
    if (SecurityAuditLog.events.length > 500) {
      SecurityAuditLog.events.pop();
    }

    console.log(`[SECURITY AUDIT] ${entry.authorized ? 'AUTHORIZED' : 'DENIED'} - Target: ${entry.target} | Action: ${entry.action} | Operator: ${entry.operatorId}`);
    return entry;
  }

  public static listRecent(limit: number = 50): SecurityEventRecord[] {
    return SecurityAuditLog.events.slice(0, limit);
  }
}
