import { ChatMessage } from '../model-router/types.js';
import { ScoredMemory } from '../../memory/types.js';

export interface ContextPayload {
  systemPrompt: string;
  messages: ChatMessage[];
  memories: ScoredMemory[];
  availableTools: string[];
}

export class ContextBuilder {
  private baseSystemPrompt: string = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), an advanced, modular personal AI assistant operating system.
Key operational guidelines:
1. Be concise, precise, actionable, and calm.
2. Adhere to user preferences retrieved from memory.
3. When facts are retrieved from memory or tools, leverage them naturally without exposing internal database or provider mechanics.
4. You operate as a single unified intelligence. Never mention internal router models or API vendors.`;

  public buildPromptMessages(
    history: ChatMessage[],
    memories: ScoredMemory[],
    userQuery: string,
    systemOverride?: string
  ): ChatMessage[] {
    const systemPrompt = systemOverride || this.baseSystemPrompt;

    // Format memories into a concise memory block
    let memoryBlock = '';
    if (memories && memories.length > 0) {
      memoryBlock = `\n\n[RELEVANT MEMORY RETRIEVAL (RANKED)]\n` +
        memories.map((m, idx) => `[${idx + 1}] (${m.memory.memory_type}): ${m.memory.content}`).join('\n');
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}${memoryBlock}`
      }
    ];

    // Include recent history (bounded to last 10 messages)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      messages.push(msg);
    }

    // Add current user query if not already in history
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userQuery) {
      messages.push({
        role: 'user',
        content: userQuery
      });
    }

    return messages;
  }
}
