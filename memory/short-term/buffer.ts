import { ChatMessage } from '../../core/model-router/types.js';

export class ShortTermBuffer {
  private messages: ChatMessage[] = [];
  private maxTokens: number;

  constructor(maxTokens: number = 4000) {
    this.maxTokens = maxTokens;
  }

  public addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.prune();
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public clear(): void {
    this.messages = [];
  }

  private prune(): void {
    // Rough estimation: 4 chars per token
    let totalChars = this.messages.reduce((acc, m) => acc + m.content.length, 0);
    const maxChars = this.maxTokens * 4;

    while (totalChars > maxChars && this.messages.length > 2) {
      // Retain system messages, prune oldest user/assistant pairs
      const removed = this.messages.shift();
      if (removed) {
        totalChars -= removed.content.length;
      }
    }
  }
}
