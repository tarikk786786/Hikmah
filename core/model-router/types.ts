export type ModelRole = 'fast' | 'reasoning' | 'coding' | 'vision' | 'local' | 'fallback';

export type ModelType =
  | 'CHAT'
  | 'FAST'
  | 'REASONING'
  | 'CODING'
  | 'VISION'
  | 'EMBEDDING'
  | 'AUDIO'
  | 'LOCAL'
  | 'FALLBACK';

export type RoutingPolicy =
  | 'QUALITY_FIRST'
  | 'SPEED_FIRST'
  | 'COST_FIRST'
  | 'LOCAL_FIRST'
  | 'PRIVACY_FIRST'
  | 'BALANCED';

export type LatencyClass = 'ULTRA_LOW' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ModelCapabilities {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
  json_schema: boolean;
  streaming: boolean;
  embeddings: boolean;
  audio: boolean;
}

export interface ModelPricing {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

export interface ModelRecord {
  id: string;
  providerId: string;
  name: string;
  type: ModelType;
  role: ModelRole;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxTokens: number;
  latencyClass: LatencyClass;
  pricing: ModelPricing;
  enabled: boolean;
  priority: number; // Higher number = higher priority within same tier
  metadata?: Record<string, unknown>;
}

export interface RouteRequirements {
  role?: ModelRole;
  type?: ModelType;
  policy?: RoutingPolicy;
  requiresTools?: boolean;
  requiresVision?: boolean;
  requiresReasoning?: boolean;
  minContextWindow?: number;
  maxLatencyClass?: LatencyClass;
  preferLocal?: boolean;
  allowFallback?: boolean;
}

export type CircuitState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'RECOVERING' | 'DISABLED';

export interface CircuitHealth {
  providerId: string;
  state: CircuitState;
  failureCount: number;
  consecutiveFailures: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastError?: string;
  cooldownUntil?: number;
}

export interface UsageRecord {
  id: string;
  userId?: string;
  requestId?: string;
  providerId: string;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK';
  timestamp: string;
}

export interface BudgetConfig {
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  softCapPercent?: number;
  alertEmail?: string;
}

export interface BudgetStatus {
  allowed: boolean;
  remainingDaily: number;
  remainingMonthly: number;
  currentDaily: number;
  currentMonthly: number;
  reason?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  template: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
  rawContent?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  stream?: boolean;
  requirements?: RouteRequirements;
  userId?: string;
  requestId?: string;
}

export interface ChatChunk {
  content?: string;
  tool_calls?: Array<{
    id?: string;
    name?: string;
    arguments?: string;
  }>;
  done?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface StructuredRequest<T> {
  prompt: string;
  systemPrompt?: string;
  schema: Record<string, unknown>;
  model?: string;
  requirements?: RouteRequirements;
}

export interface AIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  chat(input: ChatRequest): Promise<ChatResponse>;
  stream(input: ChatRequest): AsyncIterable<ChatChunk>;
  generateStructured<T>(input: StructuredRequest<T>): Promise<T>;
  embeddings(input: string[]): Promise<number[][]>;
}
