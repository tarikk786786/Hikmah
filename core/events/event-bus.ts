import { v4 as uuidv4 } from 'uuid';

export type HikmahEventType =
  | 'REQUEST_CREATED'
  | 'PLAN_CREATED'
  | 'JOB_CREATED'
  | 'JOB_STARTED'
  | 'TOOL_STARTED'
  | 'TOOL_COMPLETED'
  | 'AGENT_STARTED'
  | 'AGENT_COMPLETED'
  | 'MEMORY_CREATED'
  | 'FILE_CREATED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'JOB_FAILED'
  | 'JOB_CANCELLED'
  | 'TASK_CREATED'
  | 'TASK_QUEUED'
  | 'TASK_STARTED'
  | 'TASK_PROGRESS'
  | 'TASK_CHECKPOINT'
  | 'TASK_WAITING'
  | 'TASK_APPROVAL_REQUIRED'
  | 'TASK_RETRYING'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED';

export interface HikmahEvent {
  event_id: string;
  request_id: string;
  user_id: string;
  timestamp: string;
  source: string;
  type: HikmahEventType;
  metadata: Record<string, unknown>;
}

export type EventHandler = (event: HikmahEvent) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private static handlers: Map<HikmahEventType, EventHandler[]> = new Map();
  private static eventLog: HikmahEvent[] = [];

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public static subscribe(type: HikmahEventType, handler: EventHandler): void {
    const list = EventBus.handlers.get(type) || [];
    list.push(handler);
    EventBus.handlers.set(type, list);
  }

  public static async emit(
    typeOrObj:
      | HikmahEventType
      | {
          event: HikmahEventType;
          riskLevel?: string;
          correlation?: Record<string, unknown>;
          payload?: Record<string, unknown>;
        },
    payload?: {
      request_id?: string;
      user_id?: string;
      source?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<HikmahEvent> {
    let finalType: HikmahEventType;
    let requestId = 'system';
    let userId = 'usr_default';
    let source = 'hikmah_core';
    let metadata: Record<string, unknown> = {};

    if (typeof typeOrObj === 'string') {
      finalType = typeOrObj;
      requestId = payload?.request_id || 'system';
      userId = payload?.user_id || 'usr_default';
      source = payload?.source || 'hikmah_core';
      metadata = payload?.metadata || {};
    } else {
      finalType = typeOrObj.event;
      requestId = (typeOrObj.correlation?.taskId || typeOrObj.correlation?.requestId || 'system') as string;
      userId = (typeOrObj.correlation?.userId || 'usr_default') as string;
      source = (typeOrObj.correlation?.workerId || 'hikmah_core') as string;
      metadata = {
        ...(typeOrObj.payload || {}),
        riskLevel: typeOrObj.riskLevel
      };
    }

    const event: HikmahEvent = {
      event_id: `ev_${uuidv4().substring(0, 8)}`,
      request_id: requestId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      source,
      type: finalType,
      metadata
    };

    EventBus.eventLog.unshift(event);
    if (EventBus.eventLog.length > 500) {
      EventBus.eventLog.pop();
    }

    const listeners = EventBus.handlers.get(finalType) || [];
    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error(`Error in event listener for [${finalType}]:`, err);
      }
    }

    return event;
  }

  public static getRecentEvents(limit: number = 50): HikmahEvent[] {
    return EventBus.eventLog.slice(0, limit);
  }

  // Instance delegating methods
  public subscribe(type: HikmahEventType, handler: EventHandler): void {
    EventBus.subscribe(type, handler);
  }

  public emit(
    typeOrObj:
      | HikmahEventType
      | {
          event: HikmahEventType;
          riskLevel?: string;
          correlation?: Record<string, unknown>;
          payload?: Record<string, unknown>;
        },
    payload?: {
      request_id?: string;
      user_id?: string;
      source?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<HikmahEvent> {
    return EventBus.emit(typeOrObj, payload);
  }

  public getRecentEvents(limit: number = 50): HikmahEvent[] {
    return EventBus.getRecentEvents(limit);
  }
}
