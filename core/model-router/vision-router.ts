import { AIProvider, ChatMessage, ChatResponse } from './types.js';
import { ModelRegistry } from './model-registry.js';
import { CircuitBreaker } from './circuit-breaker.js';

export interface ImageInput {
  url?: string;
  base64?: string;
  mimeType?: string;
}

export interface VisionChatRequest {
  prompt: string;
  images: ImageInput[];
  systemPrompt?: string;
  maxTokens?: number;
}

export class VisionRouter {
  private static instance: VisionRouter;
  private providers: Map<string, AIProvider> = new Map();
  private modelRegistry: ModelRegistry;
  private circuitBreaker: CircuitBreaker;

  constructor(
    providers?: Map<string, AIProvider>,
    registry?: ModelRegistry,
    breaker?: CircuitBreaker
  ) {
    this.providers = providers || new Map();
    this.modelRegistry = registry || ModelRegistry.getInstance();
    this.circuitBreaker = breaker || CircuitBreaker.getInstance();
  }

  public static getInstance(): VisionRouter {
    if (!VisionRouter.instance) {
      VisionRouter.instance = new VisionRouter();
    }
    return VisionRouter.instance;
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public validateImage(img: ImageInput): boolean {
    if (!img.url && !img.base64) {
      throw new Error('Image input must provide either url or base64');
    }
    if (img.base64 && img.base64.length > 25 * 1024 * 1024) {
      throw new Error('Image base64 payload exceeds 25MB limit');
    }
    return true;
  }

  public async analyze(request: VisionChatRequest): Promise<ChatResponse> {
    for (const img of request.images) {
      this.validateImage(img);
    }

    // Vision candidate providers in priority order: Gemini -> OpenAI -> Anthropic -> Mock
    const candidates = ['gemini', 'openai', 'anthropic', 'mock'];
    const messages: ChatMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    // Embed image references in user message content description
    const imgDescriptions = request.images
      .map((img, idx) => `[Image ${idx + 1}: ${img.url ? img.url : `Base64 (${img.mimeType || 'image/jpeg'})`}]`)
      .join('\n');

    messages.push({
      role: 'user',
      content: `${request.prompt}\n\n${imgDescriptions}`
    });

    let lastError: Error | null = null;

    for (const providerId of candidates) {
      const provider = this.providers.get(providerId);
      if (!provider || !this.circuitBreaker.canExecute(providerId)) {
        continue;
      }

      try {
        if (await provider.isAvailable()) {
          const res = await this.circuitBreaker.executeWithBreaker(providerId, () =>
            provider.chat({
              messages,
              maxTokens: request.maxTokens || 2048,
              requirements: { requiresVision: true }
            })
          );
          return res;
        }
      } catch (err: unknown) {
        lastError = err as Error;
        console.warn(`Vision provider [${providerId}] failed. Cascading to next candidate...`);
      }
    }

    // Fallback to mock
    const mock = this.providers.get('mock');
    if (mock) {
      return await mock.chat({
        messages,
        requirements: { requiresVision: true }
      });
    }

    throw new Error(`All vision providers failed. Last error: ${lastError?.message || 'unknown'}`);
  }
}
