import { describe, it, expect } from 'vitest';
import { TaskStateMachine } from '../core/tasks/state-machine.js';

describe('PRD 06: TaskStateMachine Explicit Transition Rules', () => {
  it('should allow valid standard lifecycle transitions', () => {
    expect(TaskStateMachine.canTransition('CREATED', 'QUEUED')).toBe(true);
    expect(TaskStateMachine.canTransition('QUEUED', 'RUNNING')).toBe(true);
    expect(TaskStateMachine.canTransition('RUNNING', 'SUCCEEDED')).toBe(true);
  });

  it('should allow approval gates and pause/resume transitions', () => {
    expect(TaskStateMachine.canTransition('CREATED', 'WAITING_APPROVAL')).toBe(true);
    expect(TaskStateMachine.canTransition('WAITING_APPROVAL', 'QUEUED')).toBe(true);
    expect(TaskStateMachine.canTransition('RUNNING', 'PAUSED')).toBe(true);
    expect(TaskStateMachine.canTransition('PAUSED', 'QUEUED')).toBe(true);
    expect(TaskStateMachine.canTransition('PAUSED', 'RUNNING')).toBe(true);
  });

  it('should allow retry transitions', () => {
    expect(TaskStateMachine.canTransition('RUNNING', 'RETRYING')).toBe(true);
    expect(TaskStateMachine.canTransition('RETRYING', 'QUEUED')).toBe(true);
    expect(TaskStateMachine.canTransition('RETRYING', 'FAILED')).toBe(true);
  });

  it('should reject invalid and arbitrary transitions', () => {
    expect(TaskStateMachine.canTransition('SUCCEEDED', 'RUNNING')).toBe(false);
    expect(TaskStateMachine.canTransition('CANCELLED', 'RUNNING')).toBe(false);
    expect(TaskStateMachine.canTransition('FAILED', 'RUNNING')).toBe(false);
    expect(TaskStateMachine.canTransition('EXPIRED', 'QUEUED')).toBe(false);
    expect(TaskStateMachine.canTransition('CREATED', 'SUCCEEDED')).toBe(false);

    expect(() => TaskStateMachine.validateTransition('SUCCEEDED', 'RUNNING')).toThrow(
      /Invalid task state transition/
    );
  });

  it('should correctly classify terminal states', () => {
    expect(TaskStateMachine.isTerminal('SUCCEEDED')).toBe(true);
    expect(TaskStateMachine.isTerminal('FAILED')).toBe(true);
    expect(TaskStateMachine.isTerminal('CANCELLED')).toBe(true);
    expect(TaskStateMachine.isTerminal('EXPIRED')).toBe(true);
    expect(TaskStateMachine.isTerminal('RUNNING')).toBe(false);
    expect(TaskStateMachine.isTerminal('PAUSED')).toBe(false);
  });
});
