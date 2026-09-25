import { AIProvider, ChatRequest, ChatResponse, ChatChunk, StructuredRequest } from '../types.js';

export class MockProvider implements AIProvider {
  public id = 'mock';
  public name = 'Mock Offline Provider';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    const lastUserMessage = input.messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Check if simple math calculation
    if (lastUserMessage.toLowerCase().includes('calculate') || lastUserMessage.includes('+') || lastUserMessage.includes('*')) {
      return {
        content: `I have computed your request: ${lastUserMessage}`,
        model: 'mock-engine-v1',
        provider: 'mock',
        usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 }
      };
    }

    // Check if JSON output was requested
    const isJsonRequested = input.messages.some(
      (m) =>
        m.content.toLowerCase().includes('json') ||
        m.content.toLowerCase().includes('schema')
    );

    if (isJsonRequested) {
      return {
        content: JSON.stringify({
          title: 'Mock Execution Plan',
          steps: ['Step 1: Initialize environment', 'Step 2: Execute task'],
          status: 'SUCCESS',
          result: 'Mock JSON simulation output'
        }),
        model: 'mock-engine-v1',
        provider: 'mock',
        usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
      };
    }

    const systemMessages = input.messages.filter(m => m.role === 'system');
    const toolResultMsg = systemMessages.find(m => m.content.includes('Tool Execution Results:'));
    if (toolResultMsg) {
      return {
        content: `[HIKMAH Core Execution]\nI executed the required modules.\n\nResults:\n${toolResultMsg.content.replace('Tool Execution Results:', '').trim()}`,
        model: 'mock-engine-v1',
        provider: 'mock',
        usage: { promptTokens: 30, completionTokens: 40, totalTokens: 70 }
      };
    }

    return {
      content: `[HIKMAH Core] I have processed your request: "${lastUserMessage}". No execution tools matched. Systems operational.`,
      model: 'mock-engine-v1',
      provider: 'mock',
      usage: { promptTokens: 12, completionTokens: 14, totalTokens: 26 }
    };
  }

  async *stream(input: ChatRequest): AsyncIterable<ChatChunk> {
    const fullResponse = (await this.chat(input)).content;
    const words = fullResponse.split(' ');
    for (const word of words) {
      yield { content: word + ' ' };
      // Small pause emulation
      await new Promise(r => setTimeout(r, 10));
    }
    yield { done: true };
  }

  async generateStructured<T>(input: StructuredRequest<T>): Promise<T> {
    // Return empty mock object or parsed mock based on request
    return { status: 'success', prompt: input.prompt } as unknown as T;
  }

  async embeddings(input: string[]): Promise<number[][]> {
    // Generate deterministic 1536-dimensional mock vectors
    return input.map(text => {
      const vec = new Array(1536).fill(0);
      for (let i = 0; i < text.length && i < 1536; i++) {
        vec[i] = (text.charCodeAt(i) % 100) / 100;
      }
      return vec;
    });
  }
}
