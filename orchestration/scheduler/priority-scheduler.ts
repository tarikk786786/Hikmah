import { AgentTask, TaskPriority } from '../core/types.js';

interface QueuedTaskItem {
  task: AgentTask;
  enqueuedAt: number;
  effectivePriorityScore: number;
}

export class PriorityAwareScheduler {
  private queues: Map<TaskPriority, QueuedTaskItem[]> = new Map();
  private maxConcurrency: number;
  private runningCount: number = 0;

  private static readonly PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
    CRITICAL: 1000,
    HIGH: 500,
    NORMAL: 200,
    LOW: 50,
    BACKGROUND: 10
  };

  constructor(maxConcurrencyOrOptions: number | { maxConcurrency?: number; enableAging?: boolean } = 10) {
    if (typeof maxConcurrencyOrOptions === 'object') {
      this.maxConcurrency = maxConcurrencyOrOptions.maxConcurrency || 10;
    } else {
      this.maxConcurrency = maxConcurrencyOrOptions;
    }
    this.queues.set('CRITICAL', []);
    this.queues.set('HIGH', []);
    this.queues.set('NORMAL', []);
    this.queues.set('LOW', []);
    this.queues.set('BACKGROUND', []);
  }

  public enqueue(task: AgentTask): void {
    const queue = this.queues.get(task.priority) || this.queues.get('NORMAL')!;
    queue.push({
      task,
      enqueuedAt: Date.now(),
      effectivePriorityScore: PriorityAwareScheduler.PRIORITY_WEIGHTS[task.priority]
    });
  }

  /**
   * Dequeues next highest-priority task considering starvation prevention (aging)
   */
  public dequeue(): AgentTask | undefined {
    if (this.runningCount >= this.maxConcurrency) {
      return undefined;
    }

    this.applyAging();

    // Flatten and sort by effectivePriorityScore descending
    const allItems: QueuedTaskItem[] = [];
    for (const items of this.queues.values()) {
      allItems.push(...items);
    }

    if (allItems.length === 0) {
      return undefined;
    }

    allItems.sort((a, b) => b.effectivePriorityScore - a.effectivePriorityScore);
    const selected = allItems[0];

    // Remove from corresponding queue
    const queue = this.queues.get(selected.task.priority)!;
    const idx = queue.findIndex(item => item.task.taskId === selected.task.taskId);
    if (idx !== -1) {
      queue.splice(idx, 1);
    }

    this.runningCount++;
    return selected.task;
  }

  public taskCompleted(): void {
    if (this.runningCount > 0) {
      this.runningCount--;
    }
  }

  public getRunningCount(): number {
    return this.runningCount;
  }

  public getQueueLength(): number {
    let total = 0;
    for (const items of this.queues.values()) {
      total += items.length;
    }
    return total;
  }

  /**
   * Increases priority score for older tasks to prevent starvation
   */
  private applyAging(): void {
    const now = Date.now();
    for (const [priority, items] of this.queues.entries()) {
      const baseWeight = PriorityAwareScheduler.PRIORITY_WEIGHTS[priority];
      for (const item of items) {
        const waitSeconds = (now - item.enqueuedAt) / 1000;
        // Age boost: add 5 points per second waited
        item.effectivePriorityScore = baseWeight + Math.floor(waitSeconds * 5);
      }
    }
  }
}

export const PriorityScheduler = PriorityAwareScheduler;
