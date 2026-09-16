import { TaskState } from './types.js';

export class TaskStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<TaskState, TaskState[]> = {
    CREATED: ['QUEUED', 'WAITING_APPROVAL', 'CANCELLED', 'BLOCKED'],
    WAITING_APPROVAL: ['QUEUED', 'CANCELLED', 'FAILED'],
    QUEUED: ['RUNNING', 'PAUSED', 'CANCELLED', 'EXPIRED', 'BLOCKED'],
    RUNNING: [
      'WAITING',
      'PAUSED',
      'WAITING_APPROVAL',
      'RETRYING',
      'SUCCEEDED',
      'PARTIAL',
      'FAILED',
      'CANCELLED'
    ],
    WAITING: ['RUNNING', 'CANCELLED', 'EXPIRED', 'FAILED'],
    PAUSED: ['QUEUED', 'RUNNING', 'CANCELLED'],
    RETRYING: ['QUEUED', 'RUNNING', 'FAILED'],
    PARTIAL: ['SUCCEEDED', 'FAILED', 'RETRYING'],
    BLOCKED: ['QUEUED', 'CANCELLED', 'FAILED'],
    // Terminal States
    SUCCEEDED: [],
    FAILED: [],
    CANCELLED: [],
    EXPIRED: []
  };

  public static canTransition(current: TaskState, target: TaskState): boolean {
    if (current === target) return true;
    const allowed = this.ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  public static validateTransition(current: TaskState, target: TaskState): void {
    if (!this.canTransition(current, target)) {
      throw new Error(
        `Invalid task state transition: Cannot transition from [${current}] to [${target}].`
      );
    }
  }

  public static isTerminal(state: TaskState): boolean {
    return ['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(state);
  }

  public static isPaused(state: TaskState): boolean {
    return state === 'PAUSED';
  }

  public static isRunning(state: TaskState): boolean {
    return state === 'RUNNING';
  }
}
