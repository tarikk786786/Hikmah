import { AIProvider } from './types.js';
import { ModelRegistry } from './model-registry.js';
import { CircuitBreaker } from './circuit-breaker.js';

export class EmbeddingRouter {
  private static instance: EmbeddingRouter;
  private providers: Map<string, AIProvider> = new Map();
  private modelRegistry: ModelRegistry;
  private circuitBreaker: CircuitBreaker;
  private cache: Map<string, number[]> = new Map();
  private maxCacheSize = 1000;

  constructor(
    providers?: Map<string, AIProvider>,
    registry?: ModelRegistry,
    breaker?: CircuitBreaker
  ) {
    this.providers = providers || new Map();
    this.modelRegistry = registry || ModelRegistry.getInstance();
    this.circuitBreaker = breaker || CircuitBreaker.getInstance();
  }

  public static getInstance(): EmbeddingRouter {
    if (!EmbeddingRouter.instance) {
      EmbeddingRouter.instance = new EmbeddingRouter();
    }
    return EmbeddingRouter.instance;
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public async getEmbeddings(texts: string[], preferLocal = false): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    // Check cache first
    for (let i = 0; i < texts.length; i++) {
      const cached = this.cache.get(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    if (uncachedTexts.length === 0) {
      return results as number[][];
    }

    // Determine candidate providers
    const candidateProviders = preferLocal
      ? ['ollama', 'openai', 'gemini', 'mock']
      : ['openai', 'gemini', 'ollama', 'mock'];

    let computedVectors: number[][] | null = null;
    let successfulProvider = 'mock';

    for (const providerId of candidateProviders) {
      const provider = this.providers.get(providerId);
      if (!provider || !this.circuitBreaker.canExecute(providerId)) {
        continue;
      }

      try {
        if (await provider.isAvailable()) {
          computedVectors = await this.circuitBreaker.executeWithBreaker(providerId, () =>
            provider.embeddings(uncachedTexts)
          );
          successfulProvider = providerId;
          break;
        }
      } catch (err) {
        console.warn(`Embedding provider [${providerId}] failed. Cascading to next candidate...`);
      }
    }

    // If still null, force fallback to mock
    if (!computedVectors) {
      const mock = this.providers.get('mock');
      if (mock) {
        computedVectors = await mock.embeddings(uncachedTexts);
      } else {
        computedVectors = uncachedTexts.map(() => new Array(1536).fill(0.01));
      }
    }

    // Populate results and update cache
    for (let j = 0; j < uncachedTexts.length; j++) {
      const vec = computedVectors[j];
      const origIndex = uncachedIndices[j];
      results[origIndex] = vec;

      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(uncachedTexts[j], vec);
    }

    return results as number[][];
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
