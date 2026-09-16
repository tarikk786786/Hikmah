import { AIProvider, ChatRequest, ChatResponse, ChatChunk, StructuredRequest } from '../types.js';

export class AnthropicProvider implements AIProvider {
  public id = 'anthropic';
  public name = 'Anthropic Claude';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error('Anthropic API key is missing');

    const systemMessage = input.messages.find(m => m.role === 'system')?.content;
    const userAndAssistantMessages = input.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: input.model || 'claude-3-5-sonnet-latest',
        messages: userAndAssistantMessages,
        system: systemMessage,
        max_tokens: input.maxTokens || 4096,
        temperature: input.temperature ?? 0.7
      })
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data.content?.map((b: { text?: string }) => b.text || '').join('') || '';

    return {
      content,
      model: data.model || 'claude',
      provider: this.id,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined
    };
  }

  async *stream(input: ChatRequest): AsyncIterable<ChatChunk> {
    // Basic streaming fallback or direct chat resolution for Phase 1
    const res = await this.chat(input);
    const words = res.content.split(' ');
    for (const word of words) {
      yield { content: word + ' ' };
      await new Promise(r => setTimeout(r, 15));
    }
    yield { done: true };
  }

  async generateStructured<T>(input: StructuredRequest<T>): Promise<T> {
    const res = await this.chat({
      messages: [
        ...(input.systemPrompt ? [{ role: 'system' as const, content: input.systemPrompt }] : []),
        { role: 'user', content: `${input.prompt}\n\nRespond with strict valid JSON only conforming to: ${JSON.stringify(input.schema)}` }
      ]
    });
    const match = res.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, res.content];
    return JSON.parse(match[1] || res.content) as T;
  }

  async embeddings(_input: string[]): Promise<number[][]> {
    throw new Error('Anthropic does not provide an embeddings endpoint; use OpenAI or Ollama adapter for embeddings');
  }
}
