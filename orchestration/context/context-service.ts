import { MemoryRouter } from '../../memory/core/router/router.js';

export interface ContextBundle {
  workflowId: string;
  taskId: string;
  relevantMemory: string[];
  prerequisiteOutputs: Record<string, unknown>;
  evidenceSnippets: string[];
  artifactRefs: string[];
  estimatedTokenCount: number;
}

export class ContextService {
  private static instance: ContextService;
  private memoryRouter: MemoryRouter;

  constructor(memoryRouter?: MemoryRouter) {
    this.memoryRouter = memoryRouter || MemoryRouter.getInstance();
  }

  public static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  /**
   * Constructs an optimized context bundle bounded by a token budget
   */
  public async buildContext(options: {
    workflowId: string;
    taskId: string;
    query: string;
    userId: string;
    prerequisiteOutputs?: Record<string, unknown>;
    evidence?: string[];
    artifacts?: string[];
    maxTokens?: number;
  }): Promise<ContextBundle> {
    const maxTokens = options.maxTokens || 4000;
    const relevantMemory: string[] = [];

    try {
      // Query MemoryRouter for relevant context
      const memories = await this.memoryRouter.search({
        queryText: options.query,
        userId: options.userId,
        limit: 5
      });
      if (memories && Array.isArray(memories)) {
        for (const m of memories) {
          if (m.content) {
            relevantMemory.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
          }
        }
      }
    } catch {
      // Graceful fallback if memory router is empty/offline
    }

    const prereqs = options.prerequisiteOutputs || {};
    const evidence = options.evidence || [];
    const artifacts = options.artifacts || [];

    // Calculate approximate tokens (4 chars per token rule of thumb)
    const rawContent = [
      ...relevantMemory,
      JSON.stringify(prereqs),
      ...evidence
    ].join('\n');

    const estimatedTokenCount = Math.ceil(rawContent.length / 4);

    return {
      workflowId: options.workflowId,
      taskId: options.taskId,
      relevantMemory: relevantMemory.slice(0, 5),
      prerequisiteOutputs: prereqs,
      evidenceSnippets: evidence.slice(0, 10),
      artifactRefs: artifacts,
      estimatedTokenCount
    };
  }
}
