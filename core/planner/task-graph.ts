import { v4 as uuidv4 } from 'uuid';
import { RuntimeTarget } from '../capabilities/types.js';

export type TaskNodeState =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'BLOCKED'
  | 'REQUIRES_APPROVAL';

export interface TaskGraphNode {
  id: string;
  name: string;
  capabilityId: string;
  runtime: RuntimeTarget;
  state: TaskNodeState;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  approvalId?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskGraphEdge {
  fromNodeId: string;
  toNodeId: string;
  condition?: 'ON_SUCCESS' | 'ALWAYS';
}

export interface SerializedTaskGraph {
  id: string;
  goal: string;
  nodes: TaskGraphNode[];
  edges: TaskGraphEdge[];
  state: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'HALTED';
  createdAt: string;
  updatedAt: string;
}

export class TaskGraph {
  public id: string;
  public goal: string;
  private nodes: Map<string, TaskGraphNode> = new Map();
  private edges: TaskGraphEdge[] = [];
  public state: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'HALTED' = 'PLANNED';
  public createdAt: string;
  public updatedAt: string;

  constructor(goal: string, id?: string) {
    this.id = id || `graph_${uuidv4().substring(0, 8)}`;
    this.goal = goal;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  public addNode(node: Omit<TaskGraphNode, 'id' | 'state' | 'retryCount'> & { id?: string }): TaskGraphNode {
    const fullNode: TaskGraphNode = {
      ...node,
      id: node.id || `node_${uuidv4().substring(0, 8)}`,
      state: 'PENDING',
      retryCount: 0
    };
    this.nodes.set(fullNode.id, fullNode);
    this.updatedAt = new Date().toISOString();
    return fullNode;
  }

  public addEdge(fromNodeId: string, toNodeId: string, condition: 'ON_SUCCESS' | 'ALWAYS' = 'ON_SUCCESS'): void {
    if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) {
      throw new Error(`Invalid edge: nodes [${fromNodeId} -> ${toNodeId}] must exist`);
    }
    this.edges.push({ fromNodeId, toNodeId, condition });
    this.updatedAt = new Date().toISOString();
  }

  public getNode(id: string): TaskGraphNode | undefined {
    return this.nodes.get(id);
  }

  public listNodes(): TaskGraphNode[] {
    return Array.from(this.nodes.values());
  }

  public listEdges(): TaskGraphEdge[] {
    return [...this.edges];
  }

  public getDependencies(nodeId: string): TaskGraphNode[] {
    const incomingEdges = this.edges.filter(e => e.toNodeId === nodeId);
    return incomingEdges.map(e => this.nodes.get(e.fromNodeId)!).filter(Boolean);
  }

  public getReadyNodes(): TaskGraphNode[] {
    const ready: TaskGraphNode[] = [];

    for (const node of this.nodes.values()) {
      if (node.state !== 'PENDING' && node.state !== 'RETRYING') {
        continue;
      }

      const deps = this.getDependencies(node.id);
      const allDepsSatisfied = deps.every(d => d.state === 'SUCCESS');

      if (allDepsSatisfied) {
        ready.push(node);
      }
    }

    return ready;
  }

  public updateNodeState(nodeId: string, state: TaskNodeState, outputOrError?: { output?: any; error?: string }): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.state = state;
    if (outputOrError?.output) node.output = outputOrError.output;
    if (outputOrError?.error) node.error = outputOrError.error;

    if (state === 'RUNNING' && !node.startedAt) {
      node.startedAt = new Date().toISOString();
    }
    if (state === 'SUCCESS' || state === 'FAILED' || state === 'CANCELLED') {
      node.completedAt = new Date().toISOString();
    }

    this.checkGraphCompletion();
    this.updatedAt = new Date().toISOString();
  }

  private checkGraphCompletion(): void {
    const all = Array.from(this.nodes.values());
    if (all.every(n => n.state === 'SUCCESS')) {
      this.state = 'COMPLETED';
    } else if (all.some(n => n.state === 'FAILED' && n.retryCount >= n.maxRetries)) {
      this.state = 'FAILED';
    } else if (all.some(n => n.state === 'REQUIRES_APPROVAL')) {
      this.state = 'HALTED';
    } else if (all.some(n => n.state === 'RUNNING')) {
      this.state = 'EXECUTING';
    }
  }

  public serialize(): SerializedTaskGraph {
    return {
      id: this.id,
      goal: this.goal,
      nodes: this.listNodes(),
      edges: this.listEdges(),
      state: this.state,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public static deserialize(data: SerializedTaskGraph): TaskGraph {
    const graph = new TaskGraph(data.goal, data.id);
    graph.state = data.state;
    graph.createdAt = data.createdAt;
    graph.updatedAt = data.updatedAt;

    for (const node of data.nodes) {
      graph.nodes.set(node.id, { ...node });
    }
    for (const edge of data.edges) {
      graph.edges.push({ ...edge });
    }

    return graph;
  }
}
