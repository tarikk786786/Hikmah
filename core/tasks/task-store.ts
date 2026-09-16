import { Task, TaskCheckpoint, TaskFilter } from './types.js';

export class TaskStore {
  private static instance: TaskStore;
  private tasks: Map<string, Task> = new Map();
  private checkpoints: Map<string, TaskCheckpoint[]> = new Map();
  private idempotencyKeys: Map<string, string> = new Map(); // key -> taskId

  public static getInstance(): TaskStore {
    if (!TaskStore.instance) {
      TaskStore.instance = new TaskStore();
    }
    return TaskStore.instance;
  }

  public async createTask(task: Task): Promise<Task> {
    if (task.idempotencyKey) {
      const existingTaskId = this.idempotencyKeys.get(task.idempotencyKey);
      if (existingTaskId) {
        const existing = this.tasks.get(existingTaskId);
        if (existing) return existing;
      }
      this.idempotencyKeys.set(task.idempotencyKey, task.id);
    }

    const copy = { ...task };
    this.tasks.set(task.id, copy);
    return { ...copy };
  }

  public async getTask(id: string): Promise<Task | null> {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  public async getTaskByIdempotencyKey(key: string): Promise<Task | null> {
    const taskId = this.idempotencyKeys.get(key);
    if (!taskId) return null;
    return this.getTask(taskId);
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task [${id}] not found in store`);
    }

    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(id, updated);
    return { ...updated };
  }

  public async listTasks(filter?: TaskFilter): Promise<Task[]> {
    let list = Array.from(this.tasks.values());

    if (filter) {
      if (filter.userId) {
        list = list.filter((t) => t.userId === filter.userId);
      }
      if (filter.projectId) {
        list = list.filter((t) => t.projectId === filter.projectId);
      }
      if (filter.workflowId) {
        list = list.filter((t) => t.workflowId === filter.workflowId);
      }
      if (filter.type) {
        list = list.filter((t) => t.type === filter.type);
      }
      if (filter.assignedWorker) {
        list = list.filter((t) => t.assignedWorker === filter.assignedWorker);
      }
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          list = list.filter((t) => filter.status!.includes(t.status));
        } else {
          list = list.filter((t) => t.status === filter.status);
        }
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.offset) {
      list = list.slice(filter.offset);
    }
    if (filter?.limit) {
      list = list.slice(0, filter.limit);
    }

    return list.map((t) => ({ ...t }));
  }

  public async saveCheckpoint(checkpoint: TaskCheckpoint): Promise<TaskCheckpoint> {
    const list = this.checkpoints.get(checkpoint.taskId) || [];
    list.push({ ...checkpoint });
    this.checkpoints.set(checkpoint.taskId, list);

    // Also update task progress in the task record
    const task = this.tasks.get(checkpoint.taskId);
    if (task) {
      task.progress = checkpoint.progress;
      task.currentStep = checkpoint.stepId;
      task.updatedAt = new Date().toISOString();
    }

    return { ...checkpoint };
  }

  public async getLatestCheckpoint(taskId: string): Promise<TaskCheckpoint | null> {
    const list = this.checkpoints.get(taskId);
    if (!list || list.length === 0) return null;
    return { ...list[list.length - 1] };
  }

  public async listCheckpoints(taskId: string): Promise<TaskCheckpoint[]> {
    const list = this.checkpoints.get(taskId) || [];
    return list.map((c) => ({ ...c }));
  }

  public async recordIdempotency(key: string, taskId: string): Promise<boolean> {
    if (this.idempotencyKeys.has(key)) {
      return false;
    }
    this.idempotencyKeys.set(key, taskId);
    return true;
  }

  public async findStaleRunningTasks(staleBeforeTimestampMs: number): Promise<Task[]> {
    const now = Date.now();
    return Array.from(this.tasks.values())
      .filter((t) => t.status === 'RUNNING')
      .filter((t) => {
        const lastUpdated = new Date(t.updatedAt).getTime();
        return now - lastUpdated > staleBeforeTimestampMs;
      })
      .map((t) => ({ ...t }));
  }

  public clear(): void {
    this.tasks.clear();
    this.checkpoints.clear();
    this.idempotencyKeys.clear();
  }
}
