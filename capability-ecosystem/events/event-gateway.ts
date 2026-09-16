import crypto from 'crypto';

export interface UniversalIntegrationEvent {
  eventId: string;
  type: string; // e.g. 'github.issue.created', 'gmail.message.received'
  source: string;
  provider: string;
  timestamp: string;
  actor: Record<string, any>;
  resource: Record<string, any>;
  payload: Record<string, any>;
  traceId: string;
}

export class UniversalEventGateway {
  private static instance: UniversalEventGateway;
  private listeners: Array<(event: UniversalIntegrationEvent) => void> = [];
  private eventLog: UniversalIntegrationEvent[] = [];

  public static getInstance(): UniversalEventGateway {
    if (!UniversalEventGateway.instance) {
      UniversalEventGateway.instance = new UniversalEventGateway();
    }
    return UniversalEventGateway.instance;
  }

  public subscribe(handler: (event: UniversalIntegrationEvent) => void): void {
    this.listeners.push(handler);
  }

  public emit(event: Omit<UniversalIntegrationEvent, 'eventId' | 'timestamp' | 'traceId'>): UniversalIntegrationEvent {
    const fullEvent: UniversalIntegrationEvent = {
      ...event,
      eventId: `evt_${crypto.randomBytes(8).toString('hex')}`,
      timestamp: new Date().toISOString(),
      traceId: `tr_${crypto.randomBytes(8).toString('hex')}`,
    };

    this.eventLog.push(fullEvent);
    if (this.eventLog.length > 2000) this.eventLog.shift();

    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error('[UniversalEventGateway] Listener execution error:', err);
      }
    }

    return fullEvent;
  }

  public getRecentEvents(limit = 50): UniversalIntegrationEvent[] {
    return this.eventLog.slice(-limit);
  }
}
