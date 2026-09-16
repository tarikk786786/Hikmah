import { describe, it, expect } from 'vitest';
import { TaskGraph } from '../core/planner/task-graph.js';

describe('TaskGraph', () => {
  it('should build a directed dependency graph and resolve ready nodes', () => {
    const graph = new TaskGraph('Research and summarize quantum algorithms');

    const node1 = graph.addNode({
      name: 'Search web',
      capabilityId: 'cap_tool_web_search',
      runtime: 'RENDER',
      input: { query: 'quantum algorithms' },
      maxRetries: 2
    });

    const node2 = graph.addNode({
      name: 'Extract insights',
      capabilityId: 'cap_doc_extractor',
      runtime: 'RENDER',
      input: {},
      maxRetries: 2
    });

    const node3 = graph.addNode({
      name: 'Store in memory',
      capabilityId: 'cap_memory_pgvector',
      runtime: 'SUPABASE_EDGE',
      input: {},
      maxRetries: 2
    });

    graph.addEdge(node1.id, node2.id);
    graph.addEdge(node2.id, node3.id);

    // Initial ready node should only be node1 (no incoming dependencies)
    let ready = graph.getReadyNodes();
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe(node1.id);

    // Simulate node1 success
    graph.updateNodeState(node1.id, 'SUCCESS', { output: { results: ['found 3 papers'] } });

    // Now node2 should become ready
    ready = graph.getReadyNodes();
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe(node2.id);

    // Simulate node2 success
    graph.updateNodeState(node2.id, 'SUCCESS', { output: { text: 'summary' } });

    // Now node3 should become ready
    ready = graph.getReadyNodes();
    expect(ready.length).toBe(1);
    expect(ready[0].id).toBe(node3.id);

    // Simulate node3 success -> graph completes
    graph.updateNodeState(node3.id, 'SUCCESS', { output: { memoryId: 'mem_123' } });
    expect(graph.state).toBe('COMPLETED');
  });

  it('should serialize and deserialize preserving state across worker restarts', () => {
    const graph = new TaskGraph('Restart persistence test');
    const n1 = graph.addNode({
      name: 'Step 1',
      capabilityId: 'cap_test',
      runtime: 'VERCEL',
      input: { a: 1 },
      maxRetries: 1
    });

    graph.updateNodeState(n1.id, 'RUNNING');

    const serialized = graph.serialize();
    const restored = TaskGraph.deserialize(serialized);

    expect(restored.id).toBe(graph.id);
    expect(restored.state).toBe('EXECUTING');
    expect(restored.getNode(n1.id)?.state).toBe('RUNNING');
  });
});
