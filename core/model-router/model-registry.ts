import { ModelRecord, ModelRole, ModelType, RouteRequirements } from './types.js';
import { CapabilityRegistry } from '../capabilities/registry.js';
import { Capability } from '../capabilities/types.js';

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelRecord> = new Map();

  constructor() {
    this.seedDefaultModels();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  private seedDefaultModels(): void {
    const defaults: ModelRecord[] = [
      // --- OpenAI ---
      {
        id: 'gpt-4o',
        providerId: 'openai',
        name: 'GPT-4o Omnimodel',
        type: 'CHAT',
        role: 'reasoning',
        capabilities: {
          tools: true,
          vision: true,
          reasoning: true,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: true
        },
        contextWindow: 128000,
        maxTokens: 4096,
        latencyClass: 'LOW',
        pricing: {
          inputCostPerMillion: 2.5,
          outputCostPerMillion: 10.0
        },
        enabled: true,
        priority: 90
      },
      {
        id: 'gpt-4o-mini',
        providerId: 'openai',
        name: 'GPT-4o Mini',
        type: 'FAST',
        role: 'fast',
        capabilities: {
          tools: true,
          vision: true,
          reasoning: false,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 128000,
        maxTokens: 4096,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.15,
          outputCostPerMillion: 0.6
        },
        enabled: true,
        priority: 85
      },
      {
        id: 'o3-mini',
        providerId: 'openai',
        name: 'o3-mini Reasoning',
        type: 'REASONING',
        role: 'reasoning',
        capabilities: {
          tools: true,
          vision: false,
          reasoning: true,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 200000,
        maxTokens: 65536,
        latencyClass: 'MEDIUM',
        pricing: {
          inputCostPerMillion: 1.1,
          outputCostPerMillion: 4.4
        },
        enabled: true,
        priority: 95
      },
      {
        id: 'text-embedding-3-small',
        providerId: 'openai',
        name: 'Text Embedding 3 Small',
        type: 'EMBEDDING',
        role: 'fast',
        capabilities: {
          tools: false,
          vision: false,
          reasoning: false,
          json_schema: false,
          streaming: false,
          embeddings: true,
          audio: false
        },
        contextWindow: 8191,
        maxTokens: 0,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.02,
          outputCostPerMillion: 0.0
        },
        enabled: true,
        priority: 90
      },

      // --- Anthropic ---
      {
        id: 'claude-3-7-sonnet',
        providerId: 'anthropic',
        name: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
        type: 'REASONING',
        role: 'reasoning',
        capabilities: {
          tools: true,
          vision: true,
          reasoning: true,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 200000,
        maxTokens: 8192,
        latencyClass: 'LOW',
        pricing: {
          inputCostPerMillion: 3.0,
          outputCostPerMillion: 15.0
        },
        enabled: true,
        priority: 98
      },
      {
        id: 'claude-3-5-haiku',
        providerId: 'anthropic',
        name: 'Claude 3.5 Haiku',
        type: 'FAST',
        role: 'fast',
        capabilities: {
          tools: true,
          vision: false,
          reasoning: false,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 200000,
        maxTokens: 4096,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.8,
          outputCostPerMillion: 4.0
        },
        enabled: true,
        priority: 88
      },

      // --- Google Gemini ---
      {
        id: 'gemini-2.5-flash',
        providerId: 'gemini',
        name: 'Gemini 2.5 Flash',
        type: 'FAST',
        role: 'fast',
        capabilities: {
          tools: true,
          vision: true,
          reasoning: true,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: true
        },
        contextWindow: 1048576,
        maxTokens: 8192,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.15,
          outputCostPerMillion: 0.6
        },
        enabled: true,
        priority: 92
      },
      {
        id: 'gemini-2.5-pro',
        providerId: 'gemini',
        name: 'Gemini 2.5 Pro Multimodal',
        type: 'REASONING',
        role: 'reasoning',
        capabilities: {
          tools: true,
          vision: true,
          reasoning: true,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: true
        },
        contextWindow: 2097152,
        maxTokens: 8192,
        latencyClass: 'LOW',
        pricing: {
          inputCostPerMillion: 1.25,
          outputCostPerMillion: 5.0
        },
        enabled: true,
        priority: 94
      },

      // --- Ollama / Local ---
      {
        id: 'llama3.3:8b',
        providerId: 'ollama',
        name: 'Llama 3.3 8B (Local)',
        type: 'LOCAL',
        role: 'local',
        capabilities: {
          tools: true,
          vision: false,
          reasoning: false,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 131072,
        maxTokens: 4096,
        latencyClass: 'LOW',
        pricing: {
          inputCostPerMillion: 0.0,
          outputCostPerMillion: 0.0
        },
        enabled: true,
        priority: 80
      },
      {
        id: 'qwen2.5-coder:7b',
        providerId: 'ollama',
        name: 'Qwen 2.5 Coder 7B (Local)',
        type: 'CODING',
        role: 'coding',
        capabilities: {
          tools: true,
          vision: false,
          reasoning: false,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 32768,
        maxTokens: 4096,
        latencyClass: 'LOW',
        pricing: {
          inputCostPerMillion: 0.0,
          outputCostPerMillion: 0.0
        },
        enabled: true,
        priority: 85
      },
      {
        id: 'nomic-embed-text',
        providerId: 'ollama',
        name: 'Nomic Embed Text (Local)',
        type: 'EMBEDDING',
        role: 'local',
        capabilities: {
          tools: false,
          vision: false,
          reasoning: false,
          json_schema: false,
          streaming: false,
          embeddings: true,
          audio: false
        },
        contextWindow: 8192,
        maxTokens: 0,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.0,
          outputCostPerMillion: 0.0
        },
        enabled: true,
        priority: 85
      },

      // --- Mock / Fallback ---
      {
        id: 'mock-chat-v1',
        providerId: 'mock',
        name: 'Mock Failover Chat',
        type: 'FALLBACK',
        role: 'fallback',
        capabilities: {
          tools: true,
          vision: true,
          reasoning: true,
          json_schema: true,
          streaming: true,
          embeddings: false,
          audio: false
        },
        contextWindow: 32768,
        maxTokens: 2048,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.0,
          outputCostPerMillion: 0.0
        },
        enabled: true,
        priority: 10
      },
      {
        id: 'mock-embed-v1',
        providerId: 'mock',
        name: 'Mock Failover Embedding',
        type: 'EMBEDDING',
        role: 'fallback',
        capabilities: {
          tools: false,
          vision: false,
          reasoning: false,
          json_schema: false,
          streaming: false,
          embeddings: true,
          audio: false
        },
        contextWindow: 8192,
        maxTokens: 0,
        latencyClass: 'ULTRA_LOW',
        pricing: {
          inputCostPerMillion: 0.0,
          outputCostPerMillion: 0.0
        },
        enabled: true,
        priority: 10
      }
    ];

    for (const m of defaults) {
      this.models.set(m.id, m);
    }
  }

  public registerModel(model: ModelRecord): void {
    this.models.set(model.id, model);
  }

  public getModel(id: string): ModelRecord | undefined {
    return this.models.get(id);
  }

  public listModels(filter?: {
    providerId?: string;
    type?: ModelType;
    role?: ModelRole;
    enabledOnly?: boolean;
  }): ModelRecord[] {
    let list = Array.from(this.models.values());

    if (filter) {
      if (filter.enabledOnly) {
        list = list.filter((m) => m.enabled);
      }
      if (filter.providerId) {
        list = list.filter((m) => m.providerId === filter.providerId);
      }
      if (filter.type) {
        list = list.filter((m) => m.type === filter.type);
      }
      if (filter.role) {
        list = list.filter((m) => m.role === filter.role);
      }
    }

    return list.sort((a, b) => b.priority - a.priority);
  }

  public findModelsByRole(role: ModelRole): ModelRecord[] {
    return this.listModels({ role, enabledOnly: true });
  }

  public findModelsByCapabilities(requirements: RouteRequirements): ModelRecord[] {
    return Array.from(this.models.values())
      .filter((m) => m.enabled)
      .filter((m) => {
        if (requirements.requiresTools && !m.capabilities.tools) return false;
        if (requirements.requiresVision && !m.capabilities.vision) return false;
        if (requirements.requiresReasoning && !m.capabilities.reasoning) return false;
        if (requirements.minContextWindow && m.contextWindow < requirements.minContextWindow) return false;
        if (requirements.type && m.type !== requirements.type) return false;
        if (requirements.role && m.role !== requirements.role && m.role !== 'fallback') return false;
        if (requirements.preferLocal && m.providerId !== 'ollama' && m.providerId !== 'mock') return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  public enableModel(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    model.enabled = true;
    return true;
  }

  public disableModel(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    model.enabled = false;
    return true;
  }

  public syncToCapabilityRegistry(capabilityRegistry?: CapabilityRegistry): void {
    const target = capabilityRegistry || CapabilityRegistry.getInstance();
    for (const model of this.models.values()) {
      const cap: Capability = {
        id: `model:${model.id}`,
        name: model.name,
        version: '1.0.0',
        category: model.type === 'EMBEDDING' ? 'embeddings' : model.capabilities.vision ? 'vision' : 'chat',
        description: `${model.name} (${model.providerId}) - Context: ${model.contextWindow.toLocaleString()} tokens`,
        provider: model.providerId,
        type: 'MODEL',
        input_schema: {
          type: 'object',
          properties: {
            messages: { type: 'array' },
            temperature: { type: 'number' },
            maxTokens: { type: 'number' }
          }
        },
        output_schema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            usage: { type: 'object' }
          }
        },
        permissions: [],
        risk_level: 'LOW',
        runtime: model.providerId === 'ollama' ? 'LOCAL' : 'VERCEL',
        supported_environments: ['local', 'staging', 'production'],
        required_secrets: model.providerId === 'ollama' || model.providerId === 'mock' ? [] : [`${model.providerId.toUpperCase()}_API_KEY`],
        dependencies: [],
        timeout: 60000,
        retry_policy: { maxRetries: 2, backoffMs: 2000 },
        enabled: model.enabled,
        health_status: 'HEALTHY',
        cost_estimate: { estimatedCostPerCallUSD: model.pricing.inputCostPerMillion / 1000 },
        tags: [model.providerId, model.type.toLowerCase(), model.role],
        documentation_url: `https://hikmah.ai/models/${model.id}`
      };
      target.register(cap);
    }
  }
}
