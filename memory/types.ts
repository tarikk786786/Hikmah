export type MemoryType =
  | 'conversation_memory'
  | 'long_term_memory'
  | 'semantic_memory'
  | 'project_memory'
  | 'preference_memory'
  | 'task_memory'
  | 'event_memory';

export interface MemoryRecord {
  id: string;
  user_id: string;
  project_id?: string;
  conversation_id?: string;
  content: string;
  memory_type: MemoryType;
  importance: number; // 1.0 to 10.0
  confidence: number; // 0.0 to 1.0
  source: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryQuery {
  userId: string;
  queryText: string;
  projectId?: string;
  memoryTypes?: MemoryType[];
  minImportance?: number;
  limit?: number;
}

export interface ScoredMemory {
  memory: MemoryRecord;
  score: number;
  similarity: number;
  recencyFactor: number;
}
