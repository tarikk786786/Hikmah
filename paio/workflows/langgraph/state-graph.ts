/**
 * LangGraph-style State Graph Engine for Hikmah Canonical Layer
 * Provides cyclic, stateful agent routing using node functions and conditional edges.
 */

export const START = '__start__';
export const END = '__end__';

export type NodeAction<State> = (state: State) => Promise<Partial<State>> | Partial<State>;
export type EdgeCondition<State> = (state: State) => string;

export class StateGraph<State extends Record<string, any>> {
  private nodes: Map<string, NodeAction<State>> = new Map();
  private edges: Map<string, string> = new Map();
  private conditionalEdges: Map<string, EdgeCondition<State>> = new Map();
  private entryPoint: string = START;

  constructor() {}

  /**
   * Add a node to the graph
   */
  public addNode(name: string, action: NodeAction<State>): this {
    if (name === START || name === END) {
      throw new Error(`Node name cannot be ${START} or ${END}`);
    }
    this.nodes.set(name, action);
    return this;
  }

  /**
   * Add a direct edge from one node to another
   */
  public addEdge(fromNode: string, toNode: string): this {
    if (fromNode === END) throw new Error(`Cannot add edge from ${END}`);
    this.edges.set(fromNode, toNode);
    return this;
  }

  /**
   * Add a conditional edge that dynamically routes based on state
   */
  public addConditionalEdge(fromNode: string, condition: EdgeCondition<State>): this {
    if (fromNode === END) throw new Error(`Cannot add edge from ${END}`);
    this.conditionalEdges.set(fromNode, condition);
    return this;
  }

  /**
   * Set the entry point (defaults to START)
   */
  public setEntryPoint(node: string): this {
    this.entryPoint = node;
    this.addEdge(START, node);
    return this;
  }

  /**
   * Set the finish point
   */
  public setFinishPoint(node: string): this {
    this.addEdge(node, END);
    return this;
  }

  /**
   * Compile the graph into an executable runner
   */
  public compile() {
    // Validation
    if (!this.edges.has(START)) {
      throw new Error('Graph must have an entry point connected from START');
    }

    return new GraphRunner(this.nodes, this.edges, this.conditionalEdges);
  }
}

export class GraphRunner<State extends Record<string, any>> {
  constructor(
    private nodes: Map<string, NodeAction<State>>,
    private edges: Map<string, string>,
    private conditionalEdges: Map<string, EdgeCondition<State>>
  ) {}

  /**
   * Execute the graph until END is reached, updating state sequentially
   */
  public async invoke(initialState: State, maxSteps: number = 25): Promise<{ state: State, trace: string[] }> {
    let currentState = { ...initialState };
    let currentNode = this.edges.get(START);
    const trace: string[] = [START];

    let steps = 0;
    while (currentNode && currentNode !== END) {
      if (steps++ >= maxSteps) {
        throw new Error(`Graph execution exceeded max steps (${maxSteps}). Circular dependency?`);
      }

      trace.push(currentNode);

      const action = this.nodes.get(currentNode);
      if (!action) {
        throw new Error(`Node [${currentNode}] is missing an action definition.`);
      }

      // Execute node action and merge state
      const stateUpdate = await action(currentState);
      currentState = { ...currentState, ...stateUpdate };

      // Determine next node
      const conditionalEdge = this.conditionalEdges.get(currentNode);
      if (conditionalEdge) {
        currentNode = conditionalEdge(currentState);
      } else {
        currentNode = this.edges.get(currentNode);
      }
    }

    trace.push(END);
    return { state: currentState, trace };
  }
}
