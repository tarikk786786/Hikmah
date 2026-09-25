import { AIProvider, AIModel } from '../../../paio/types/universal.js';

export class VLLMProvider implements AIProvider {
  public id = 'vllm';
  public name = 'vLLM (Local Inference)';
  public type: 'local' | 'cloud' | 'hybrid' | 'offline' = 'local';
  public status: 'active' | 'degraded' | 'unavailable' = 'active';

  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000/v1') {
    this.baseUrl = baseUrl;
  }

  public async getAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      if (!response.ok) throw new Error('vLLM API unreachable');
      
      const data = await response.json();
      return data.data.map((m: any) => ({
        id: m.id,
        providerId: this.id,
        name: m.id,
        capabilities: ['text-generation', 'completion'],
        contextWindow: 32768, // Default fallback
      }));
    } catch (e) {
      console.warn(`[vLLM] Engine offline at ${this.baseUrl}`);
      return [];
    }
  }

  public async generateCompletion(modelId: string, prompt: string, maxTokens: number = 1024): Promise<string> {
    const response = await fetch(`${this.baseUrl}/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        prompt: prompt,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`vLLM generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].text;
  }
}
