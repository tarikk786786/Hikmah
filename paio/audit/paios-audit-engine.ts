import crypto from 'crypto';
import { AISystemBus, PAIOSSystemEvent } from '../events/ai-system-bus';

export interface PAIOSDecisionRecord {
  id: string;
  traceId: string;
  sessionId?: string;
  projectId?: string;
  userId?: string;
  action: string;
  decision: 'allowed' | 'blocked' | 'routed' | 'approval_required' | 'requires_approval' | 'completed' | 'failed';
  rationale: {
    capabilityMatched?: string;
    privacyPolicyMatched?: string;
    hardwareCompatible?: boolean;
    providerHealthy?: boolean;
    userDefaultApplied?: boolean;
    ruleSummary: string;
  };
  details: Record<string, unknown>;
  timestamp: string;
}

export class PAIOSAuditEngine {
  private static instance: PAIOSAuditEngine;
  private decisionRecords: PAIOSDecisionRecord[] = [];
  private bus = AISystemBus.getInstance();

  private constructor() {
    // Listen to system bus for automatic auditing
    this.bus.subscribe((event: PAIOSSystemEvent) => {
      if (event.type.startsWith('policy.') || event.type.startsWith('intent.') || event.type.startsWith('action.')) {
        this.logDecision({
          traceId: event.traceId,
          sessionId: event.sessionId,
          projectId: event.projectId,
          userId: event.userId,
          action: event.type,
          decision: event.type.includes('blocked') || event.type.includes('rejected') ? 'blocked' : 'allowed',
          rationale: {
            ruleSummary: `System event: ${event.type} processed from source ${event.source}`,
            privacyPolicyMatched: (event.data?.currentMode as string) || undefined,
          },
          details: event.data,
        });
      }
    });
  }

  public static getInstance(): PAIOSAuditEngine {
    if (!PAIOSAuditEngine.instance) {
      PAIOSAuditEngine.instance = new PAIOSAuditEngine();
    }
    return PAIOSAuditEngine.instance;
  }

  public logDecision(record: Omit<PAIOSDecisionRecord, 'id' | 'timestamp'>): PAIOSDecisionRecord {
    const fullRecord: PAIOSDecisionRecord = {
      ...record,
      id: `dec_${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };

    this.decisionRecords.push(fullRecord);
    if (this.decisionRecords.length > 5000) {
      this.decisionRecords.shift();
    }

    return fullRecord;
  }

  public explain(actionOrTraceId: string): PAIOSDecisionRecord | undefined {
    return this.decisionRecords.slice().reverse().find(
      d => d.traceId === actionOrTraceId || d.action === actionOrTraceId || d.id === actionOrTraceId
    );
  }

  public query(filter?: {
    traceId?: string;
    sessionId?: string;
    projectId?: string;
    decision?: PAIOSDecisionRecord['decision'];
    limit?: number;
  }): PAIOSDecisionRecord[] {
    let list = [...this.decisionRecords];
    if (filter?.traceId) list = list.filter(d => d.traceId === filter.traceId);
    if (filter?.sessionId) list = list.filter(d => d.sessionId === filter.sessionId);
    if (filter?.projectId) list = list.filter(d => d.projectId === filter.projectId);
    if (filter?.decision) list = list.filter(d => d.decision === filter.decision);

    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.slice(0, filter?.limit || 50);
  }
}
