import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry } from '../core/model-router/model-registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

describe('PRD 05: ModelRegistry & Capability Integration', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  it('should seed default models across major cloud and local providers', () => {
    const models = registry.listModels();
    expect(models.length).toBeGreaterThanOrEqual(10);

    const gpt4o = registry.getModel('gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.providerId).toBe('openai');
    expect(gpt4o?.capabilities.tools).toBe(true);

    const sonnet = registry.getModel('claude-3-7-sonnet');
    expect(sonnet).toBeDefined();
    expect(sonnet?.providerId).toBe('anthropic');
    expect(sonnet?.capabilities.reasoning).toBe(true);

    const flash = registry.getModel('gemini-2.5-flash');
    expect(flash).toBeDefined();
    expect(flash?.providerId).toBe('gemini');
    expect(flash?.latencyClass).toBe('ULTRA_LOW');

    const llama = registry.getModel('llama3.3:8b');
    expect(llama).toBeDefined();
    expect(llama?.providerId).toBe('ollama');
  });

  it('should filter models by role', () => {
    const reasoningModels = registry.findModelsByRole('reasoning');
    expect(reasoningModels.length).toBeGreaterThan(0);
    expect(reasoningModels.every((m) => m.role === 'reasoning')).toBe(true);

    const fastModels = registry.findModelsByRole('fast');
    expect(fastModels.length).toBeGreaterThan(0);
    expect(fastModels.every((m) => m.role === 'fast')).toBe(true);
  });

  it('should match models by capabilities (vision, tools, context)', () => {
    const visionModels = registry.findModelsByCapabilities({ requiresVision: true });
    expect(visionModels.length).toBeGreaterThan(0);
    expect(visionModels.every((m) => m.capabilities.vision)).toBe(true);

    const hugeContextModels = registry.findModelsByCapabilities({ minContextWindow: 500000 });
    expect(hugeContextModels.length).toBeGreaterThan(0);
    expect(hugeContextModels.some((m) => m.id === 'gemini-2.5-flash')).toBe(true);
  });

  it('should support dynamic registration and enabling/disabling', () => {
    registry.registerModel({
      id: 'custom-fine-tune',
      providerId: 'custom',
      name: 'Custom Domain Model',
      type: 'CHAT',
      role: 'coding',
      capabilities: {
        tools: true,
        vision: false,
        reasoning: true,
        json_schema: true,
        streaming: true,
        embeddings: false,
        audio: false
      },
      contextWindow: 65536,
      maxTokens: 4096,
      latencyClass: 'LOW',
      pricing: { inputCostPerMillion: 1.0, outputCostPerMillion: 2.0 },
      enabled: true,
      priority: 80
    });

    expect(registry.getModel('custom-fine-tune')).toBeDefined();

    registry.disableModel('custom-fine-tune');
    expect(registry.getModel('custom-fine-tune')?.enabled).toBe(false);

    const enabledOnly = registry.listModels({ enabledOnly: true });
    expect(enabledOnly.some((m) => m.id === 'custom-fine-tune')).toBe(false);
  });

  it('should synchronize models into CapabilityRegistry as MODEL capabilities', () => {
    const capRegistry = new CapabilityRegistry();
    registry.syncToCapabilityRegistry(capRegistry);

    const modelCaps = capRegistry.list({ type: 'MODEL' });
    expect(modelCaps.length).toBeGreaterThanOrEqual(10);
    expect(modelCaps.some((c) => c.id === 'model:gpt-4o')).toBe(true);
    expect(modelCaps.some((c) => c.id === 'model:gemini-2.5-flash')).toBe(true);
  });
});
