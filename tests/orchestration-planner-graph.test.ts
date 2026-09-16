import { describe, it, expect } from 'vitest';
import { AgentPlanner } from '../orchestration/planner/agent-planner.js';
import { TaskGraphEngine } from '../orchestration/graph/task-graph-engine.js';
import { AgentPriority } from '../orchestration/core/types.js';

describe('PRD 20: Orchestration Planner & Task Graph Engine', () => {
  const planner = new AgentPlanner();
  const graphEngine = new TaskGraphEngine();

  it('should decompose a user goal into a topological task graph plan', async () => {
    const plan = planner.plan('Research Post-Quantum Cryptography and write a Rust implementation');
    expect(plan).toBeDefined();
    expect(plan.planId).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThanOrEqual(3);
    expect(plan.dependencies.length).toBeGreaterThanOrEqual(2);
    expect(plan.estimatedComplexity).toBeDefined();
  });

  it('should detect cycles in a task graph and throw error', () => {
    const nodes = new Map();
    nodes.set('task_1', { id: 'task_1', task: { taskId: 'task_1', objective: 'T1' } });
    nodes.set('task_2', { id: 'task_2', task: { taskId: 'task_2', objective: 'T2' } });

    const cyclicEdges = [
      { fromNodeId: 'task_1', toNodeId: 'task_2' },
      { fromNodeId: 'task_2', toNodeId: 'task_1' },
    ];

    expect(() => {
      graphEngine.assertNoCycles(nodes, cyclicEdges);
    }).toThrow(/Circular dependency detected/);
  });

  it('should successfully build task graph and resolve ready tasks', () => {
    const plan = planner.plan('Research and code');
    const graph = graphEngine.createGraph('wf_test', 'Research and code', plan.tasks, plan.dependencies);

    expect(graph).toBeDefined();
    expect(graph.nodes.size).toBe(plan.tasks.length);

    const executable = graphEngine.getExecutableTasks('wf_test');
    expect(executable.length).toBeGreaterThanOrEqual(1);
  });
});

