import { AgentTask, GraphNode, GraphEdge, TaskGraph, TaskStatus } from '../core/types.js';

export interface GraphExecutionEvent {
  eventId: string;
  workflowId: string;
  type: 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'TASK_BLOCKED' | 'APPROVAL_REQUIRED' | 'GRAPH_COMPLETED' | 'GRAPH_FAILED';
  taskId?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export class TaskGraphEngine {
  private graphs: Map<string, TaskGraph> = new Map();
  private listeners: Array<(event: GraphExecutionEvent) => void> = [];

  public createGraph(workflowId: string, goal: string, tasks: AgentTask[], dependencies: Array<{ from: string; to: string }>): TaskGraph {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    // 1. Create nodes
    for (const task of tasks) {
      nodes.set(task.taskId, {
        id: task.taskId,
        task,
        isApprovalNode: task.capability === 'production_deploy' || task.capability === 'destructive_action' || task.priority === 'CRITICAL' && task.agentType === 'coding'
      });
    }

    // 2. Create edges
    for (const dep of dependencies) {
      edges.push({
        fromNodeId: dep.from,
        toNodeId: dep.to
      });
    }

    // 3. Verify DAG has no circular dependencies
    this.assertNoCycles(nodes, edges);

    const graph: TaskGraph = {
      workflowId,
      goal,
      nodes,
      edges,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.graphs.set(workflowId, graph);
    return graph;
  }

  public getGraph(workflowId: string): TaskGraph | undefined {
    return this.graphs.get(workflowId);
  }

  public subscribe(listener: (event: GraphExecutionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: GraphExecutionEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in graph event listener:', err);
      }
    }
  }

  /**
   * Identifies all tasks that are currently ready to execute (all dependencies completed)
   */
  public getExecutableTasks(workflowId: string): AgentTask[] {
    const graph = this.graphs.get(workflowId);
    if (!graph) return [];

    const executable: AgentTask[] = [];

    for (const node of graph.nodes.values()) {
      if (node.task.status === 'pending' || node.task.status === 'queued') {
        // Check if all prerequisite dependencies are completed
        const deps = node.task.dependencies || [];
        const allCompleted = deps.every(depId => {
          const depNode = graph.nodes.get(depId);
          return depNode && depNode.task.status === 'completed';
        });

        if (allCompleted) {
          executable.push(node.task);
        }
      }
    }

    return executable;
  }

  /**
   * Updates task status and checks if downstream nodes should be unlocked or if workflow has finished
   */
  public updateTaskStatus(
    workflowId: string,
    taskId: string,
    status: TaskStatus,
    outputs?: Record<string, unknown>,
    error?: string
  ): void {
    const graph = this.graphs.get(workflowId);
    if (!graph) return;

    const node = graph.nodes.get(taskId);
    if (!node) return;

    node.task.status = status;
    if (outputs) node.task.outputs = outputs;
    if (error) node.task.error = error;

    if (status === 'running') {
      node.task.startedAt = new Date().toISOString();
      this.emit({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workflowId,
        type: 'TASK_STARTED',
        taskId,
        timestamp: new Date().toISOString()
      });
    } else if (status === 'completed') {
      node.task.completedAt = new Date().toISOString();
      this.emit({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workflowId,
        type: 'TASK_COMPLETED',
        taskId,
        data: outputs,
        timestamp: new Date().toISOString()
      });
    } else if (status === 'failed') {
      node.task.completedAt = new Date().toISOString();
      this.emit({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workflowId,
        type: 'TASK_FAILED',
        taskId,
        data: { error },
        timestamp: new Date().toISOString()
      });
    } else if (status === 'waiting_approval') {
      this.emit({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workflowId,
        type: 'APPROVAL_REQUIRED',
        taskId,
        timestamp: new Date().toISOString()
      });
    }

    // Check overall graph state
    this.evaluateGraphProgress(graph);
  }

  private evaluateGraphProgress(graph: TaskGraph): void {
    const nodes = Array.from(graph.nodes.values());
    const hasFailed = nodes.some(n => n.task.status === 'failed');
    const allCompleted = nodes.every(n => n.task.status === 'completed');
    const isPaused = nodes.some(n => n.task.status === 'waiting_approval');

    if (hasFailed) {
      graph.status = 'FAILED';
      this.emit({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workflowId: graph.workflowId,
        type: 'GRAPH_FAILED',
        timestamp: new Date().toISOString()
      });
    } else if (allCompleted) {
      graph.status = 'COMPLETED';
      this.emit({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workflowId: graph.workflowId,
        type: 'GRAPH_COMPLETED',
        timestamp: new Date().toISOString()
      });
    } else if (isPaused) {
      graph.status = 'PAUSED';
    } else {
      graph.status = 'RUNNING';
    }

    graph.updatedAt = new Date().toISOString();
  }

  /**
   * Topological Cycle Detection via DFS
   */
  public assertNoCycles(nodes: Map<string, GraphNode>, edges: GraphEdge[]): void {
    const adjList = new Map<string, string[]>();
    for (const id of nodes.keys()) {
      adjList.set(id, []);
    }
    for (const edge of edges) {
      if (adjList.has(edge.fromNodeId)) {
        adjList.get(edge.fromNodeId)!.push(edge.toNodeId);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const id of nodes.keys()) {
      if (!visited.has(id)) {
        if (dfs(id)) {
          throw new Error(`Circular dependency detected in TaskGraph containing node [${id}]`);
        }
      }
    }
  }
}
