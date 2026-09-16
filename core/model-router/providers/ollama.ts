import { AIProvider, ChatRequest, ChatResponse, ChatChunk, StructuredRequest } from '../types.js';

export class OllamaProvider implements AIProvider {
  public id = 'ollama';
  public name = 'Ollama Local Runtime';
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model || process.env.OLLAMA_DEFAULT_MODEL || 'llama3:8b',
        messages: input.messages,
        stream: false,
        options: {
          temperature: input.temperature ?? 0.7
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama chat error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();
    return {
      content: data.message?.content || '',
      model: data.model || 'ollama',
      provider: this.id,
      usage: data.prompt_eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: data.prompt_eval_count + data.eval_count
      } : undefined
    };
  }

  async *stream(input: ChatRequest): AsyncIterable<ChatChunk> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model || process.env.OLLAMA_DEFAULT_MODEL || 'llama3:8b',
        messages: input.messages,
        stream: true
      })
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream error: ${await res.text()}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            yield { content: parsed.message.content };
          }
          if (parsed.done) {
            yield { done: true };
            return;
          }
        } catch {
          // Ignore partial line parses
        }
      }
    }
  }

  async generateStructured<T>(input: StructuredRequest<T>): Promise<T> {
    const res = await this.chat({
      messages: [
        ...(input.systemPrompt ? [{ role: 'system' as const, content: input.systemPrompt }] : []),
        { role: 'user', content: `${input.prompt}\n\nRespond strictly with JSON schema: ${JSON.stringify(input.schema)}` }
      ],
      temperature: 0.1
    });

    const match = res.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, res.content];
    return JSON.parse(match[1] || res.content) as T;
  }

  async embeddings(input: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of input) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text
        })
      });
      if (!res.ok) throw new Error(`Ollama embedding error: ${await res.text()}`);
      const data = await res.json();
      results.push(data.embedding);
    }
    return results;
  }
}
