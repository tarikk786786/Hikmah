import crypto from 'crypto';

export interface PAIOSSystemEvent {
  id: string;
  type: string;
  actor?: string;
  source: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  projectId?: string;
  sessionId?: string;
  data: Record<string, any>;
  permissions?: Record<string, any>;
  traceId: string;
}

export class AISystemBus {
  private static instance: AISystemBus;
  private listeners: Array<(event: PAIOSSystemEvent) => void> = [];
  private eventLog: PAIOSSystemEvent[] = [];

  public static getInstance(): AISystemBus {
    if (!AISystemBus.instance) {
      AISystemBus.instance = new AISystemBus();
    }
    return AISystemBus.instance;
  }

  public subscribe(listener: (event: PAIOSSystemEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public emit(event: Omit<PAIOSSystemEvent, 'id' | 'timestamp' | 'traceId'>): PAIOSSystemEvent {
    const fullEvent: PAIOSSystemEvent = {
      ...event,
      id: `evt_paio_${crypto.randomBytes(8).toString('hex')}`,
      timestamp: new Date().toISOString(),
      traceId: `tr_paio_${crypto.randomBytes(8).toString('hex')}`,
    };

    this.eventLog.push(fullEvent);
    if (this.eventLog.length > 5000) {
      this.eventLog.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error('[AISystemBus] Listener execution error:', err);
      }
    }

    return fullEvent;
  }

  public getEvents(filter?: { type?: string; projectId?: string; sessionId?: string; limit?: number }): PAIOSSystemEvent[] {
    let res = [...this.eventLog];
    if (filter?.type) {
      res = res.filter(e => e.type === filter.type || e.type.startsWith(filter.type!));
    }
    if (filter?.projectId) {
      res = res.filter(e => e.projectId === filter.projectId);
    }
    if (filter?.sessionId) {
      res = res.filter(e => e.sessionId === filter.sessionId);
    }
    return res.slice(-(filter?.limit || 50));
  }
}
