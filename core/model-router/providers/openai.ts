import { AIProvider, ChatRequest, ChatResponse, ChatChunk, StructuredRequest } from '../types.js';

export class OpenAICompatibleProvider implements AIProvider {
  public id = 'openai';
  public name = 'OpenAI Compatible Gateway';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing');
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: input.model || 'gpt-4o-mini',
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
        tools: input.tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }))
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error [${res.status}]: ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || '',
      model: data.model || input.model || 'unknown',
      provider: this.id,
      tool_calls: choice?.message?.tool_calls,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }

  async *stream(input: ChatRequest): AsyncIterable<ChatChunk> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing');
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: input.model || 'gpt-4o-mini',
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens,
        stream: true
      })
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`OpenAI stream error [${res.status}]: ${err}`);
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
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.replace('data: ', '').trim();
        if (payload === '[DONE]') {
          yield { done: true };
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield { content: delta.content };
          }
        } catch {
          // Ignore JSON parse errors on partial stream chunks
        }
      }
    }
  }

  async generateStructured<T>(input: StructuredRequest<T>): Promise<T> {
    const res = await this.chat({
      messages: [
        ...(input.systemPrompt ? [{ role: 'system' as const, content: input.systemPrompt }] : []),
        { role: 'user', content: `${input.prompt}\n\nYou MUST return valid JSON matching this schema: ${JSON.stringify(input.schema)}` }
      ],
      temperature: 0.1
    });

    // Extract JSON block if wrapped in markdown
    const content = res.content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
    return JSON.parse(jsonMatch[1] || content) as T;
  }

  async embeddings(input: string[]): Promise<number[][]> {
    if (!this.apiKey) throw new Error('OpenAI API key missing');
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input
      })
    });

    if (!res.ok) throw new Error(`OpenAI embeddings error: ${await res.text()}`);
    const data = await res.json();
    return data.data.map((item: { embedding: number[] }) => item.embedding);
  }
}
