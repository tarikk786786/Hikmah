import { v4 as uuidv4 } from 'uuid';
import { RiskLevel } from '../../core/safety/types.js';

export interface CorrelationContext {
  requestId: string;
  conversationId?: string;
  agentRunId?: string;
  jobId?: string;
  userId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: string;
  riskLevel: RiskLevel;
  correlation: CorrelationContext;
  payload: Record<string, unknown>;
}

export class AuditLogger {
  private static inMemoryLogs: AuditLogEntry[] = [];

  public static createCorrelation(overrides?: Partial<CorrelationContext>): CorrelationContext {
    return {
      requestId: overrides?.requestId || `req_${uuidv4().substring(0, 8)}`,
      conversationId: overrides?.conversationId,
      agentRunId: overrides?.agentRunId,
      jobId: overrides?.jobId,
      userId: overrides?.userId || 'usr_anonymous'
    };
  }

  public static log(
    event: string,
    riskLevel: RiskLevel,
    correlation: CorrelationContext,
    payload: Record<string, unknown> = {}
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      event,
      riskLevel,
      correlation,
      payload
    };

    AuditLogger.inMemoryLogs.unshift(entry);
    // Keep max 500 entries in-memory buffer
    if (AuditLogger.inMemoryLogs.length > 500) {
      AuditLogger.inMemoryLogs.pop();
    }

    // Structured logging format for observability (DataDog/CloudWatch/Render logs)
    console.log(JSON.stringify({
      level: riskLevel === 'CRITICAL' ? 'ERROR' : riskLevel === 'HIGH' ? 'WARN' : 'INFO',
      audit_event: event,
      ...entry
    }));

    return entry;
  }

  public static getRecentLogs(limit: number = 50): AuditLogEntry[] {
    return AuditLogger.inMemoryLogs.slice(0, limit);
  }
}
