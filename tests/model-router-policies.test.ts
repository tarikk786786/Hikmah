import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter } from '../core/model-router/router.js';
import { AIProvider, ChatRequest, ChatResponse, ChatChunk, StructuredRequest } from '../core/model-router/types.js';

class FailingProvider implements AIProvider {
  id = 'failing-cloud';
  name = 'Failing Cloud AI';
  async isAvailable(): Promise<boolean> {
    return true;
  }
  async chat(_input: ChatRequest): Promise<ChatResponse> {
    throw new Error('503 Service Unavailable');
  }
  async *stream(_input: ChatRequest): AsyncIterable<ChatChunk> {
    throw new Error('Stream broken');
  }
  async generateStructured<T>(_input: StructuredRequest<T>): Promise<T> {
    throw new Error('503 Service Unavailable');
  }
  async embeddings(_input: string[]): Promise<number[][]> {
    throw new Error('503 Service Unavailable');
  }
}

describe('PRD 05: ModelRouter Policy Engine & Resilient Gateway', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  it('should rank models under SPEED_FIRST policy prioritizing ULTRA_LOW latency', () => {
    const candidates = router.resolveCandidates('fast', { policy: 'SPEED_FIRST' });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].latencyClass).toBe('ULTRA_LOW');
  });

  it('should rank models under COST_FIRST policy prioritizing lowest combined pricing', () => {
    const candidates = router.resolveCandidates('fast', { policy: 'COST_FIRST' });
    expect(candidates.length).toBeGreaterThan(0);
    const top = candidates[0];
    const topCost = top.pricing.inputCostPerMillion + top.pricing.outputCostPerMillion;
    expect(topCost).toBe(0); // Mock or Ollama free models
  });

  it('should rank models under LOCAL_FIRST policy prioritizing Ollama / Local', () => {
    const candidates = router.resolveCandidates('local', { policy: 'LOCAL_FIRST' });
    expect(candidates.length).toBeGreaterThan(0);
    expect(['ollama', 'mock']).toContain(candidates[0].providerId);
  });

  it('should execute chat and seamlessly cascade to fallback when primary providers fail', async () => {
    const failing = new FailingProvider();
    router.registerProvider(failing);
    router.getRegistry().registerModel({
      id: 'failing-flagship',
      providerId: 'failing-cloud',
      name: 'Failing Flagship',
      type: 'CHAT',
      role: 'fast',
      capabilities: {
        tools: true,
        vision: true,
        reasoning: true,
        json_schema: true,
        streaming: true,
        embeddings: false,
        audio: false
      },
      contextWindow: 128000,
      maxTokens: 4096,
      latencyClass: 'LOW',
      pricing: { inputCostPerMillion: 1.0, outputCostPerMillion: 2.0 },
      enabled: true,
      priority: 100 // Highest priority to be tried first
    });

    const response = await router.chat(
      {
        messages: [{ role: 'user', content: 'What is Hikmah?' }]
      },
      'fast'
    );

    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
    // Successfully cascaded without throwing
    expect(response.provider).toBeTruthy();
  });

  it('should generate structured validated JSON data', async () => {
    interface TaskPlan {
      title: string;
      steps: string[];
    }

    const plan = await router.generateStructured<TaskPlan>({
      prompt: 'Create a simple 2-step plan',
      schema: {
        type: 'object',
        required: ['title', 'steps']
      }
    });

    expect(plan).toBeDefined();
    expect(plan.title).toBeDefined();
    expect(Array.isArray(plan.steps)).toBe(true);
  });

  it('should handle embedding requests with caching', async () => {
    const emb1 = await router.embeddings(['Hello Hikmah']);
    expect(emb1.length).toBe(1);
    expect(emb1[0].length).toBeGreaterThan(0);

    // Second call should return cached vector
    const emb2 = await router.embeddings(['Hello Hikmah']);
    expect(emb2[0]).toEqual(emb1[0]);
  });
});
