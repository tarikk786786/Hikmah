import { AIProvider, ChatRequest, ChatResponse, ChatChunk, StructuredRequest } from '../types.js';

export class GeminiProvider implements AIProvider {
  public id = 'gemini';
  public name = 'Google Gemini Gateway';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) throw new Error('Gemini API key is missing');
    const model = input.model || 'gemini-1.5-flash';

    const contents = input.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = input.messages.find(m => m.role === 'system')?.content;

    const res = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: input.temperature ?? 0.7,
          maxOutputTokens: input.maxTokens
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API error [${res.status}]: ${await res.text()}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      model,
      provider: this.id,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined
    };
  }

  async *stream(input: ChatRequest): AsyncIterable<ChatChunk> {
    const res = await this.chat(input);
    const words = res.content.split(' ');
    for (const word of words) {
      yield { content: word + ' ' };
      await new Promise(r => setTimeout(r, 12));
    }
    yield { done: true };
  }

  async generateStructured<T>(input: StructuredRequest<T>): Promise<T> {
    const res = await this.chat({
      messages: [
        ...(input.systemPrompt ? [{ role: 'system' as const, content: input.systemPrompt }] : []),
        { role: 'user', content: `${input.prompt}\n\nRespond with strict JSON schema: ${JSON.stringify(input.schema)}` }
      ],
      temperature: 0.1
    });
    const match = res.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, res.content];
    return JSON.parse(match[1] || res.content) as T;
  }

  async embeddings(input: string[]): Promise<number[][]> {
    if (!this.apiKey) throw new Error('Gemini API key missing');
    const model = 'text-embedding-004';
    const embeddingsList: number[][] = [];

    for (const text of input) {
      const res = await fetch(`${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] }
        })
      });
      if (!res.ok) throw new Error(`Gemini embeddings error: ${await res.text()}`);
      const data = await res.json();
      embeddingsList.push(data.embedding.values);
    }
    return embeddingsList;
  }
}
