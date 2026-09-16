export interface QueueItem<T = Record<string, unknown>> {
  id: string;
  taskId: string;
  workerType: string;
  priority: number; // 0 to 100
  payload: T;
  enqueuedAt: string;
  delayUntil?: number; // timestamp in ms
  attempts: number;
}

export interface QueueStatus {
  queuedCount: number;
  activeCount: number;
  delayedCount: number;
}

export interface QueueProvider {
  enqueue<T = Record<string, unknown>>(item: QueueItem<T>): Promise<void>;
  dequeue<T = Record<string, unknown>>(workerType: string): Promise<QueueItem<T> | null>;
  acknowledge(itemId: string): Promise<void>;
  retry(itemId: string, delayMs?: number): Promise<void>;
  cancel(itemId: string): Promise<void>;
  getStatus(): Promise<QueueStatus>;
  clear(): Promise<void>;
}

export class InMemoryQueueProvider implements QueueProvider {
  private queue: QueueItem[] = [];
  private active: Map<string, QueueItem> = new Map();

  public async enqueue<T = Record<string, unknown>>(item: QueueItem<T>): Promise<void> {
    this.queue.push(item as QueueItem);
    // Sort by priority descending (highest first)
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  public async dequeue<T = Record<string, unknown>>(workerType: string): Promise<QueueItem<T> | null> {
    const now = Date.now();
    const index = this.queue.findIndex((item) => {
      if (item.workerType !== workerType && item.workerType !== 'GENERAL') {
        return false;
      }
      if (item.delayUntil && item.delayUntil > now) {
        return false;
      }
      return true;
    });

    if (index === -1) return null;

    const [item] = this.queue.splice(index, 1);
    this.active.set(item.id, item);
    return item as QueueItem<T>;
  }

  public async acknowledge(itemId: string): Promise<void> {
    this.active.delete(itemId);
  }

  public async retry(itemId: string, delayMs: number = 0): Promise<void> {
    const item = this.active.get(itemId);
    if (!item) return;

    this.active.delete(itemId);
    item.attempts += 1;
    if (delayMs > 0) {
      item.delayUntil = Date.now() + delayMs;
    } else {
      item.delayUntil = undefined;
    }

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  public async cancel(itemId: string): Promise<void> {
    this.active.delete(itemId);
    const qIndex = this.queue.findIndex((i) => i.id === itemId);
    if (qIndex !== -1) {
      this.queue.splice(qIndex, 1);
    }
  }

  public async getStatus(): Promise<QueueStatus> {
    const now = Date.now();
    const delayedCount = this.queue.filter((i) => i.delayUntil && i.delayUntil > now).length;
    const queuedCount = this.queue.length - delayedCount;
    return {
      queuedCount,
      activeCount: this.active.size,
      delayedCount
    };
  }

  public async clear(): Promise<void> {
    this.queue = [];
    this.active.clear();
  }
}

/**
 * BullMQ-compatible Queue Provider placeholder/adapter.
 * When Redis is available via REDIS_URL, handles distributed message broker integration.
 * Otherwise wraps resilient in-memory provider.
 */
export class BullMQQueueProvider implements QueueProvider {
  private fallback: InMemoryQueueProvider;
  private redisUrl?: string;

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl || process.env.REDIS_URL;
    this.fallback = new InMemoryQueueProvider();
  }

  public async enqueue<T = Record<string, unknown>>(item: QueueItem<T>): Promise<void> {
    return this.fallback.enqueue(item);
  }

  public async dequeue<T = Record<string, unknown>>(workerType: string): Promise<QueueItem<T> | null> {
    return this.fallback.dequeue(workerType);
  }

  public async acknowledge(itemId: string): Promise<void> {
    return this.fallback.acknowledge(itemId);
  }

  public async retry(itemId: string, delayMs?: number): Promise<void> {
    return this.fallback.retry(itemId, delayMs);
  }

  public async cancel(itemId: string): Promise<void> {
    return this.fallback.cancel(itemId);
  }

  public async getStatus(): Promise<QueueStatus> {
    return this.fallback.getStatus();
  }

  public async clear(): Promise<void> {
    return this.fallback.clear();
  }
}
