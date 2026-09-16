import {
  AIProvider,
  ModelRole,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  RouteRequirements,
  ModelRecord,
  StructuredRequest
} from './types.js';
import { OpenAICompatibleProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
import { MockProvider } from './providers/mock.js';
import { ModelRegistry } from './model-registry.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { CostUsageLedger } from './usage-ledger.js';
import { PromptManager } from './prompt-manager.js';
import { ResponseValidator } from './response-validator.js';
import { EmbeddingRouter } from './embedding-router.js';
import { VisionRouter } from './vision-router.js';

export class ModelRouter {
  private providers: Map<string, AIProvider> = new Map();
  private modelRegistry: ModelRegistry;
  private circuitBreaker: CircuitBreaker;
  private usageLedger: CostUsageLedger;
  private promptManager: PromptManager;
  private responseValidator: ResponseValidator;
  private embeddingRouter: EmbeddingRouter;
  private visionRouter: VisionRouter;

  constructor(customProviders?: AIProvider[]) {
    this.modelRegistry = ModelRegistry.getInstance();
    this.circuitBreaker = CircuitBreaker.getInstance();
    this.usageLedger = CostUsageLedger.getInstance();
    this.promptManager = PromptManager.getInstance();
    this.responseValidator = ResponseValidator.getInstance();

    // Register built-in providers
    this.registerProvider(new OpenAICompatibleProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OllamaProvider());
    this.registerProvider(new MockProvider());

    if (customProviders) {
      for (const p of customProviders) {
        this.registerProvider(p);
      }
    }

    this.embeddingRouter = new EmbeddingRouter(this.providers, this.modelRegistry, this.circuitBreaker);
    this.visionRouter = new VisionRouter(this.providers, this.modelRegistry, this.circuitBreaker);
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    if (this.embeddingRouter) this.embeddingRouter.registerProvider(provider);
    if (this.visionRouter) this.visionRouter.registerProvider(provider);
  }

  public getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  public getRegistry(): ModelRegistry {
    return this.modelRegistry;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  public getLedger(): CostUsageLedger {
    return this.usageLedger;
  }

  public getPromptManager(): PromptManager {
    return this.promptManager;
  }

  public getResponseValidator(): ResponseValidator {
    return this.responseValidator;
  }

  public getEmbeddingRouter(): EmbeddingRouter {
    return this.embeddingRouter;
  }

  public getVisionRouter(): VisionRouter {
    return this.visionRouter;
  }

  /**
   * Sort candidate models according to active RoutingPolicy
   */
  public rankModels(models: ModelRecord[], requirements?: RouteRequirements): ModelRecord[] {
    const policy = requirements?.policy || 'BALANCED';
    const ranked = [...models];

    switch (policy) {
      case 'QUALITY_FIRST':
        return ranked.sort((a, b) => b.priority - a.priority);

      case 'SPEED_FIRST':
        return ranked.sort((a, b) => {
          const latencyScore = { ULTRA_LOW: 4, LOW: 3, MEDIUM: 2, HIGH: 1 };
          const diff = latencyScore[b.latencyClass] - latencyScore[a.latencyClass];
          return diff !== 0 ? diff : b.priority - a.priority;
        });

      case 'COST_FIRST':
        return ranked.sort((a, b) => {
          const costA = a.pricing.inputCostPerMillion + a.pricing.outputCostPerMillion;
          const costB = b.pricing.inputCostPerMillion + b.pricing.outputCostPerMillion;
          return costA - costB;
        });

      case 'LOCAL_FIRST':
      case 'PRIVACY_FIRST':
        return ranked.sort((a, b) => {
          const isLocalA = a.providerId === 'ollama' || a.providerId === 'mock' ? 1 : 0;
          const isLocalB = b.providerId === 'ollama' || b.providerId === 'mock' ? 1 : 0;
          return isLocalB - isLocalA || b.priority - a.priority;
        });

      case 'BALANCED':
      default:
        return ranked.sort((a, b) => {
          // Balanced score = Priority (0-100) - Combined Cost (normalized) + Speed bonus
          const speedBonus = a.latencyClass === 'ULTRA_LOW' ? 15 : a.latencyClass === 'LOW' ? 10 : 0;
          const costPenalty = Math.min(20, (a.pricing.inputCostPerMillion + a.pricing.outputCostPerMillion) * 2);
          const scoreA = a.priority + speedBonus - costPenalty;

          const speedBonusB = b.latencyClass === 'ULTRA_LOW' ? 15 : b.latencyClass === 'LOW' ? 10 : 0;
          const costPenaltyB = Math.min(20, (b.pricing.inputCostPerMillion + b.pricing.outputCostPerMillion) * 2);
          const scoreB = b.priority + speedBonusB - costPenaltyB;

          return scoreB - scoreA;
        });
    }
  }

  public resolveCandidates(role: ModelRole = 'fast', requirements?: RouteRequirements): ModelRecord[] {
    const req: RouteRequirements = { role, ...requirements };
    const matched = this.modelRegistry.findModelsByCapabilities(req);
    return this.rankModels(matched, req);
  }

  public async getActiveProviderForRole(role: ModelRole): Promise<AIProvider> {
    const candidates = this.resolveCandidates(role);
    for (const model of candidates) {
      const provider = this.providers.get(model.providerId);
      if (provider && this.circuitBreaker.canExecute(model.providerId)) {
        if (await provider.isAvailable()) {
          return provider;
        }
      }
    }
    return this.providers.get('mock')!;
  }

  public async chat(input: ChatRequest, role: ModelRole = 'fast'): Promise<ChatResponse> {
    const startTime = Date.now();
    const requirements = input.requirements || {};

    // Check budget limit
    const budget = this.usageLedger.checkBudgetAllowed(input.userId);
    if (!budget.allowed && !requirements.preferLocal && input.requirements?.policy !== 'LOCAL_FIRST') {
      // Force local routing to avoid cost overrun
      requirements.preferLocal = true;
      console.warn(`Budget limit reached (${budget.reason}). Shifting to local/free model.`);
    }

    const candidateModels = this.resolveCandidates(role, requirements);
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      const provider = this.providers.get(model.providerId);
      if (!provider || !this.circuitBreaker.canExecute(model.providerId)) {
        continue;
      }

      try {
        if (await provider.isAvailable()) {
          const req: ChatRequest = {
            ...input,
            model: input.model || model.id
          };

          const response = await this.circuitBreaker.executeWithBreaker(model.providerId, () =>
            provider.chat(req)
          );

          const latencyMs = Date.now() - startTime;
          const promptTokens = response.usage?.promptTokens || 50;
          const completionTokens = response.usage?.completionTokens || 150;
          const totalTokens = promptTokens + completionTokens;
          const estimatedCostUsd = this.usageLedger.calculateCost(model.pricing, promptTokens, completionTokens);

          this.usageLedger.recordUsage({
            userId: input.userId,
            requestId: input.requestId,
            providerId: model.providerId,
            modelId: model.id,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCostUsd,
            latencyMs,
            status: 'SUCCESS'
          });

          return {
            ...response,
            model: model.id,
            latencyMs,
            estimatedCostUsd
          };
        }
      } catch (err: unknown) {
        lastError = err as Error;
        console.warn(`Provider [${model.providerId}] failed during chat. Cascading to next candidate... (${(err as Error).message})`);
      }
    }

    // Failover to guaranteed Mock Provider
    const mockProvider = this.providers.get('mock')!;
    const fallbackModel = this.modelRegistry.getModel('mock-chat-v1')!;
    const fallbackRes = await mockProvider.chat(input);
    const latencyMs = Date.now() - startTime;

    this.usageLedger.recordUsage({
      userId: input.userId,
      requestId: input.requestId,
      providerId: 'mock',
      modelId: fallbackModel.id,
      promptTokens: 50,
      completionTokens: 100,
      totalTokens: 150,
      estimatedCostUsd: 0,
      latencyMs,
      status: 'FALLBACK'
    });

    return {
      ...fallbackRes,
      content: `${fallbackRes.content} (Notice: Cascaded to fallback due to: ${lastError?.message || 'providers unavailable'})`,
      latencyMs,
      estimatedCostUsd: 0
    };
  }

  public async *stream(input: ChatRequest, role: ModelRole = 'fast'): AsyncIterable<ChatChunk> {
    const candidates = this.resolveCandidates(role, input.requirements);

    for (const model of candidates) {
      const provider = this.providers.get(model.providerId);
      if (!provider || !this.circuitBreaker.canExecute(model.providerId)) {
        continue;
      }

      try {
        if (await provider.isAvailable()) {
          const req: ChatRequest = { ...input, model: input.model || model.id };
          for await (const chunk of provider.stream(req)) {
            yield chunk;
          }
          this.circuitBreaker.recordSuccess(model.providerId);
          return;
        }
      } catch (err: unknown) {
        this.circuitBreaker.recordFailure(model.providerId, err as Error);
        console.warn(`Streaming failed on provider [${model.providerId}]. Cascading to next candidate...`);
      }
    }

    // Fallback stream
    const mock = this.providers.get('mock')!;
    for await (const chunk of mock.stream(input)) {
      yield chunk;
    }
  }

  public async generateStructured<T>(input: StructuredRequest<T>): Promise<T> {
    const prompt = input.prompt;
    const systemPrompt = input.systemPrompt || 'You are an AI assistant. Output ONLY valid JSON matching the requested schema.';

    const response = await this.chat(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: input.model,
        requirements: input.requirements
      },
      'fast'
    );

    const validation = this.responseValidator.validateJson<T>(response.content, input.schema);
    if (!validation.valid || !validation.data) {
      throw new Error(`Failed to generate structured data: ${validation.error || 'unknown error'}`);
    }

    return validation.data;
  }

  public async embeddings(texts: string[], preferLocal = false): Promise<number[][]> {
    return this.embeddingRouter.getEmbeddings(texts, preferLocal);
  }
}
