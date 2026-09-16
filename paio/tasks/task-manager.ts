import crypto from 'crypto';
import { AISystemBus } from '../events/ai-system-bus';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PAIOSSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface PAIOSPersonalTask {
  id: string;
  projectId?: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId?: string;
  dueDate?: string;
  subtasks: PAIOSSubtask[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class TaskManager {
  private static instance: TaskManager;
  private tasks: Map<string, PAIOSPersonalTask> = new Map();
  private bus = AISystemBus.getInstance();

  private constructor() {
    this.seedDefaultTasks();
  }

  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  private seedDefaultTasks(): void {
    const defaultTask: PAIOSPersonalTask = {
      id: 'task_step25_verify',
      projectId: 'proj_hikmah_core',
      userId: 'user_master_owner',
      title: 'Complete and verify Step 25 PAIOS Kernel',
      description: 'Implement all 15 core PAIOS subsystems, database migrations, tests, and web desktop UI.',
      status: 'in_progress',
      priority: 'urgent',
      assignedAgentId: 'system-supervisor',
      tags: ['hikmah', 'paios', 'step-25'],
      subtasks: [
        { id: 'sub_1', title: 'Implement Identity & Policy engines', completed: true },
        { id: 'sub_2', title: 'Implement Context & Intent engines', completed: true },
        { id: 'sub_3', title: 'Implement Projects, Sessions & Devices', completed: true },
        { id: 'sub_4', title: 'Implement AI File System, Tasks & Notifications', completed: true },
        { id: 'sub_5', title: 'Implement Health, Audit & Kernel', completed: false },
        { id: 'sub_6', title: 'Implement Universal MCP Server & Web Cockpit', completed: false },
      ],
      metadata: { milestone: 'Step 25' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(defaultTask.id, defaultTask);
  }

  public createTask(params: {
    projectId?: string;
    userId?: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignedAgentId?: string;
    dueDate?: string;
    tags?: string[];
    subtasks?: string[];
  }): PAIOSPersonalTask {
    const id = `task_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const formattedSubtasks: PAIOSSubtask[] = (params.subtasks || []).map((t, idx) => ({
      id: `sub_${idx + 1}_${crypto.randomBytes(3).toString('hex')}`,
      title: t,
      completed: false,
    }));

    const task: PAIOSPersonalTask = {
      id,
      projectId: params.projectId,
      userId: params.userId || 'user_master_owner',
      title: params.title,
      description: params.description,
      status: 'todo',
      priority: params.priority || 'medium',
      assignedAgentId: params.assignedAgentId,
      dueDate: params.dueDate,
      subtasks: formattedSubtasks,
      tags: params.tags || [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);

    this.bus.emit({
      type: 'task.created',
      source: 'TaskManager',
      userId: task.userId,
      projectId: task.projectId,
      data: { taskId: id, title: task.title, priority: task.priority },
    });

    return task;
  }

  public getTask(id: string): PAIOSPersonalTask | undefined {
    return this.tasks.get(id);
  }

  public updateTask(id: string, updates: Partial<PAIOSPersonalTask>): PAIOSPersonalTask {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} does not exist.`);
    }
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });

    this.bus.emit({
      type: 'task.updated',
      source: 'TaskManager',
      userId: task.userId,
      projectId: task.projectId,
      data: { taskId: id, updates },
    });

    return task;
  }

  public completeTask(id: string): PAIOSPersonalTask {
    const task = this.updateTask(id, { status: 'completed' });
    task.subtasks.forEach(s => { s.completed = true; });

    this.bus.emit({
      type: 'task.completed',
      source: 'TaskManager',
      userId: task.userId,
      projectId: task.projectId,
      data: { taskId: id, title: task.title },
    });

    return task;
  }

  public assignAgent(taskId: string, agentId: string): PAIOSPersonalTask {
    return this.updateTask(taskId, { assignedAgentId: agentId, status: 'in_progress' });
  }

  public listTasks(filter?: {
    projectId?: string;
    userId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
  }): PAIOSPersonalTask[] {
    let list = Array.from(this.tasks.values());
    if (filter?.projectId) list = list.filter(t => t.projectId === filter.projectId);
    if (filter?.userId) list = list.filter(t => t.userId === filter.userId);
    if (filter?.status) list = list.filter(t => t.status === filter.status);
    if (filter?.priority) list = list.filter(t => t.priority === filter.priority);
    return list;
  }
}
