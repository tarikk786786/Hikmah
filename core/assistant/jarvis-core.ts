import { ModelRouter } from '../model-router/router.js';
import { ModelRole, ChatChunk, ChatMessage } from '../model-router/types.js';
import { ToolRegistry } from '../../tools/registry/registry.js';
import { MemoryStore } from '../../memory/long-term/store.js';
import { ShortTermBuffer } from '../../memory/short-term/buffer.js';
import { ContextBuilder } from '../context/builder.js';
import { SafetyClassifier } from '../safety/classifier.js';
import { TaskPlanner, ExecutionPlan } from '../planner/planner.js';
import { TaskGraph } from '../planner/task-graph.js';
import { CapabilityRegistry } from '../capabilities/registry.js';
import { ContextualCapabilityDiscovery } from '../capabilities/discovery.js';
import { EventBus } from '../events/event-bus.js';
import { AuditLogger, CorrelationContext } from '../../security/audit/logger.js';
import { ToolResult } from '../../tools/registry/types.js';

export interface JarvisRequest {
  query: string;
  userId?: string;
  conversationId?: string;
  projectId?: string;
  role?: ModelRole;
  approvalToken?: string;
}

export interface JarvisResponse {
  content: string;
  plan?: ExecutionPlan;
  taskGraph?: TaskGraph;
  toolResults: Array<{ toolName: string; result: ToolResult }>;
  correlation: CorrelationContext;
  memoriesUsed: number;
  capabilitiesUsed: string[];
}

export class JarvisCore {
  private router: ModelRouter;
  private tools: ToolRegistry;
  private memory: MemoryStore;
  private contextBuilder: ContextBuilder;
  private safety: SafetyClassifier;
  private planner: TaskPlanner;
  private capabilities: CapabilityRegistry;
  private discovery: ContextualCapabilityDiscovery;
  private sessionBuffers: Map<string, ShortTermBuffer> = new Map();

  constructor(
    router?: ModelRouter,
    tools?: ToolRegistry,
    memory?: MemoryStore,
    safety?: SafetyClassifier,
    capabilities?: CapabilityRegistry
  ) {
    this.router = router || new ModelRouter();
    this.safety = safety || new SafetyClassifier();
    this.tools = tools || new ToolRegistry(this.safety);
    this.memory = memory || new MemoryStore(this.router);
    this.capabilities = capabilities || CapabilityRegistry.getInstance();
    this.discovery = new ContextualCapabilityDiscovery(this.capabilities);
    this.contextBuilder = new ContextBuilder();
    this.planner = new TaskPlanner();
  }

  public getRouter(): ModelRouter {
    return this.router;
  }

  public getTools(): ToolRegistry {
    return this.tools;
  }

  public getMemory(): MemoryStore {
    return this.memory;
  }

  public getSafety(): SafetyClassifier {
    return this.safety;
  }

  public getCapabilities(): CapabilityRegistry {
    return this.capabilities;
  }

  public getDiscovery(): ContextualCapabilityDiscovery {
    return this.discovery;
  }

  private getSessionBuffer(conversationId: string): ShortTermBuffer {
    let buf = this.sessionBuffers.get(conversationId);
    if (!buf) {
      buf = new ShortTermBuffer();
      this.sessionBuffers.set(conversationId, buf);
    }
    return buf;
  }

  public async process(req: JarvisRequest): Promise<JarvisResponse> {
    const userId = req.userId || 'usr_default';
    const conversationId = req.conversationId || 'conv_default';
    const correlation = AuditLogger.createCorrelation({
      userId,
      conversationId
    });

    await EventBus.emit('REQUEST_CREATED', {
      request_id: correlation.requestId,
      user_id: userId,
      source: 'JarvisCore',
      metadata: { query: req.query, conversationId }
    });

    AuditLogger.log('JARVIS_REQUEST_RECEIVED', 'LOW', correlation, { query: req.query });

    // 1. Safety & Kill Switch Check
    if (this.safety.isKillSwitchActive()) {
      return {
        content: 'HIKMAH Master Kill-Switch is active. Autonomous actions and model invocations are temporarily suspended.',
        toolResults: [],
        correlation,
        memoriesUsed: 0,
        capabilitiesUsed: []
      };
    }

    const sanitizedQuery = this.safety.sanitizeInput(req.query);

    // 2. Memory Retrieval
    const relevantMemories = await this.memory.retrieveRelevant({
      userId,
      queryText: sanitizedQuery,
      projectId: req.projectId,
      limit: 4
    });

    // 3. Dynamic Contextual Capability Discovery (Reduces token bloat)
    const discoveryResult = this.discovery.discoverRelevant(sanitizedQuery, {
      maxRisk: 'HIGH',
      limit: 5
    });
    const discoveredCapabilities = discoveryResult.capabilities;

    // 4. DAG Task Graph & Execution Planning
    const availableToolNames = this.tools.listTools().filter(t => t.enabled).map(t => t.name);
    const plan = this.planner.createPlan(sanitizedQuery, availableToolNames);

    const taskGraph = new TaskGraph(sanitizedQuery);
    for (const step of plan.steps) {
      taskGraph.addNode({
        name: step.description,
        capabilityId: step.toolName ? `cap_tool_${step.toolName}` : 'cap_agent_general',
        runtime: 'VERCEL',
        input: step.parameters || {},
        maxRetries: 2
      });
    }

    await EventBus.emit('PLAN_CREATED', {
      request_id: correlation.requestId,
      user_id: userId,
      source: 'TaskPlanner',
      metadata: { planId: plan.id, stepsCount: plan.steps.length }
    });

    // 5. Execute immediate ready tool actions
    const toolResults: Array<{ toolName: string; result: ToolResult }> = [];
    for (const step of plan.steps) {
      if (step.toolName) {
        step.status = 'running';
        await EventBus.emit('TOOL_STARTED', {
          request_id: correlation.requestId,
          user_id: userId,
          source: 'ToolRegistry',
          metadata: { tool: step.toolName }
        });

        const result = await this.tools.executeTool(
          step.toolName,
          step.parameters || {},
          { userId, conversationId, correlation, approvalToken: req.approvalToken }
        );
        step.status = result.success ? 'completed' : 'failed';
        step.result = result;
        toolResults.push({ toolName: step.toolName, result });

        await EventBus.emit('TOOL_COMPLETED', {
          request_id: correlation.requestId,
          user_id: userId,
          source: 'ToolRegistry',
          metadata: { tool: step.toolName, success: result.success }
        });
      }
    }

    // 6. Bounded Context Construction
    const sessionBuf = this.getSessionBuffer(conversationId);
    const messages = this.contextBuilder.buildPromptMessages(
      sessionBuf.getMessages(),
      relevantMemories,
      sanitizedQuery
    );

    // If tool was executed, provide the tool result into context
    if (toolResults.length > 0) {
      messages.push({
        role: 'system',
        content: `Tool Execution Results:\n${toolResults.map(t => `[${t.toolName}]: ${JSON.stringify(t.result.data || t.result.error)}`).join('\n')}`
      });
    }

    // 7. Model Generation via Router
    const modelResponse = await this.router.chat({
      messages,
      tools: this.tools.getToolSchemas()
    }, req.role || 'fast');

    // 8. Update Short-Term Buffer
    sessionBuf.addMessage({ role: 'user', content: sanitizedQuery });
    sessionBuf.addMessage({ role: 'assistant', content: modelResponse.content });

    AuditLogger.log('JARVIS_RESPONSE_GENERATED', 'LOW', correlation, {
      model: modelResponse.model,
      toolResultsCount: toolResults.length,
      intentCategory: discoveryResult.intentCategory
    });

    return {
      content: modelResponse.content,
      plan,
      taskGraph,
      toolResults,
      correlation,
      memoriesUsed: relevantMemories.length,
      capabilitiesUsed: discoveredCapabilities.map(c => c.name)
    };
  }

  public async *stream(req: JarvisRequest): AsyncIterable<ChatChunk> {
    const userId = req.userId || 'usr_default';
    const conversationId = req.conversationId || 'conv_default';

    const sanitizedQuery = this.safety.sanitizeInput(req.query);
    const relevantMemories = await this.memory.retrieveRelevant({
      userId,
      queryText: sanitizedQuery,
      limit: 3
    });

    const sessionBuf = this.getSessionBuffer(conversationId);
    const messages = this.contextBuilder.buildPromptMessages(
      sessionBuf.getMessages(),
      relevantMemories,
      sanitizedQuery
    );

    for await (const chunk of this.router.stream({ messages }, req.role || 'fast')) {
      yield chunk;
    }
  }
}
