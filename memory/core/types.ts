export type MemoryClassification =
  | 'USER'
  | 'PROJECT'
  | 'DOCUMENT'
  | 'EVENT'
  | 'TASK'
  | 'AGENT'
  | 'PROCEDURAL'
  | 'TEMPORAL'
  | 'ENTITY'
  | 'RELATIONSHIP'
  | 'PREFERENCE'
  | 'KNOWLEDGE'
  | 'EPISODIC'
  | 'WORKING';

export type MemoryScope =
  | 'USER'
  | 'PROJECT'
  | 'TEAM'
  | 'ORGANIZATION'
  | 'GLOBAL';

export type MemoryAuthority =
  | 'USER_EXPLICIT'        // Rank 1: Direct explicit user statements (highest authority)
  | 'VERIFIED_SYSTEM_DATA' // Rank 2: System audit logs, hardware sensors
  | 'VERIFIED_TOOL_RESULT' // Rank 3: Successful tool execution outputs
  | 'PROJECT_SOURCE'       // Rank 4: Codebase files, git commits
  | 'DOCUMENT'             // Rank 5: Uploaded PDFs, docs
  | 'WEB'                  // Rank 6: Searched or scraped public web
  | 'MODEL_INFERENCE';     // Rank 7: LLM guesses/deductions (lowest authority)

export type ProviderHealthState =
  | 'BUILT_IN'
  | 'CONFIGURED'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'DISABLED'
  | 'NOT_CONFIGURED';

export interface UnifiedMemoryRecord {
  id: string;
  userId: string;
  projectId?: string;
  content: string;
  classification: MemoryClassification;
  scope: MemoryScope;
  authority: MemoryAuthority;
  provider: string; // 'native-supabase' | 'mem0' | 'graphiti' | 'letta' | 'cognee' | 'langmem' | 'supermemory'
  providerRecordId?: string;
  importance: number; // 1 to 10
  confidence: number; // 0 to 1
  relevance?: number; // 0 to 1 in search results
  embedding?: number[];
  source: string;
  sourceId?: string;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryWriteInput {
  content: string;
  userId: string;
  projectId?: string;
  classification?: MemoryClassification;
  scope?: MemoryScope;
  authority?: MemoryAuthority;
  targetProvider?: string;
  importance?: number;
  confidence?: number;
  source?: string;
  sourceId?: string;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryQueryInput {
  queryText: string;
  userId: string;
  projectId?: string;
  classifications?: MemoryClassification[];
  scopes?: MemoryScope[];
  targetProvider?: string;
  minImportance?: number;
  minConfidence?: number;
  limit?: number;
  timeWindow?: {
    from?: string;
    to?: string;
  };
}

export interface MemoryTimelineQuery {
  userId: string;
  projectId?: string;
  entityId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface MemoryRelatedQuery {
  entityId: string;
  userId: string;
  projectId?: string;
  depth?: number;
  relationshipTypes?: string[];
  limit?: number;
}

export interface MemoryContextPacket {
  facts: UnifiedMemoryRecord[];
  preferences: UnifiedMemoryRecord[];
  history: UnifiedMemoryRecord[];
  relationships: UnifiedMemoryRecord[];
  documents: UnifiedMemoryRecord[];
  procedures: UnifiedMemoryRecord[];
  agentState?: UnifiedMemoryRecord[];
  formattedContext: string;
}

export interface MemoryProviderHealth {
  provider: string;
  status: ProviderHealthState;
  latencyMs: number;
  recordCount: number;
  lastCheckedAt: string;
  error?: string;
}

export interface MemoryProvider {
  readonly id: string;
  readonly name: string;
  readonly primaryClassifications: MemoryClassification[];
  
  remember(input: MemoryWriteInput): Promise<UnifiedMemoryRecord>;
  recall(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]>;
  search(query: MemoryQueryInput): Promise<UnifiedMemoryRecord[]>;
  update(id: string, updates: Partial<MemoryWriteInput>): Promise<UnifiedMemoryRecord | null>;
  forget(id: string): Promise<boolean>;
  list(filter?: { userId?: string; projectId?: string; limit?: number }): Promise<UnifiedMemoryRecord[]>;
  timeline?(query: MemoryTimelineQuery): Promise<UnifiedMemoryRecord[]>;
  related?(query: MemoryRelatedQuery): Promise<UnifiedMemoryRecord[]>;
  consolidate?(scope: MemoryScope, userId: string, projectId?: string): Promise<{ consolidatedCount: number }>;
  healthCheck(): Promise<MemoryProviderHealth>;
}
