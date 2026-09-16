/**
 * HIKMAH AI Operating System - Step 24: Plugin / Provider Ecosystem
 * Canonical Universal Provider Interface & Domain Contracts
 */

export type ProviderHealthStatus = 
  | 'HEALTHY' 
  | 'DEGRADED' 
  | 'UNAVAILABLE' 
  | 'AUTH_ERROR' 
  | 'RATE_LIMITED' 
  | 'DISABLED';

export interface ProviderHealthReport {
  status: ProviderHealthStatus;
  latencyMs: number;
  lastCheckedAt: string;
  consecutiveFailures: number;
  message?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
  retryCount?: number;
  customHeaders?: Record<string, string>;
  options?: Record<string, any>;
}

export interface AuthContext {
  accountId?: string;
  tenantId?: string;
  userId?: string;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthResult {
  authenticated: boolean;
  accountId?: string;
  expiresAt?: string;
  scopes?: string[];
  error?: string;
}

export interface ExecutionContext {
  traceId?: string;
  userId?: string;
  tenantId?: string;
  accountId?: string;
  policyContext?: string;
  idempotencyKey?: string;
}

/**
 * Universal Provider Base Contract
 */
export interface Provider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: string;

  capabilities(): Promise<Record<string, boolean>>;
  health(): Promise<ProviderHealthReport>;
  configure(config: ProviderConfig): Promise<void>;
  authenticate(context: AuthContext): Promise<AuthResult>;
  execute(operation: string, input: any, context?: ExecutionContext): Promise<any>;
}

// --- Specialized Domain Interfaces ---

export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  snippet?: string;
  body: string;
  date: string;
  unread: boolean;
  labels?: string[];
  attachments?: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
}

export interface SendEmailInput {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{ filename: string; contentBase64: string; mimeType: string }>;
}

export interface EmailQuery {
  query?: string;
  unreadOnly?: boolean;
  maxResults?: number;
  pageToken?: string;
  label?: string;
}

export interface EmailProvider extends Provider {
  search(query: EmailQuery, context?: ExecutionContext): Promise<EmailMessage[]>;
  read(id: string, context?: ExecutionContext): Promise<EmailMessage>;
  send(input: SendEmailInput, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }>;
  reply(id: string, body: string, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  organizer?: string;
  isAllDay?: boolean;
}

export interface CalendarProvider extends Provider {
  listEvents(timeMin: string, timeMax: string, context?: ExecutionContext): Promise<CalendarEvent[]>;
  createEvent(event: Omit<CalendarEvent, 'id'>, context?: ExecutionContext): Promise<CalendarEvent>;
  updateEvent(id: string, event: Partial<CalendarEvent>, context?: ExecutionContext): Promise<CalendarEvent>;
  deleteEvent(id: string, context?: ExecutionContext): Promise<boolean>;
}

export interface StorageProviderContract extends Provider {
  read(path: string, context?: ExecutionContext): Promise<Buffer | string>;
  write(path: string, data: Buffer | string, mimeType?: string, context?: ExecutionContext): Promise<{ success: boolean; uri: string }>;
  list(prefix?: string, context?: ExecutionContext): Promise<Array<{ path: string; sizeBytes: number; updatedAt: string }>>;
  delete(path: string, context?: ExecutionContext): Promise<boolean>;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  engine?: string;
}

export interface SearchProvider extends Provider {
  search(query: string, options?: { maxResults?: number; categories?: string[] }, context?: ExecutionContext): Promise<SearchResultItem[]>;
}

export interface GitIssue {
  id: number;
  title: string;
  body: string;
  author: string;
  state: 'open' | 'closed';
  labels: string[];
  createdAt: string;
}

export interface GitProvider extends Provider {
  searchRepos(query: string, context?: ExecutionContext): Promise<Array<{ name: string; fullName: string; description: string; stars: number }>>;
  getIssue(repo: string, issueNumber: number, context?: ExecutionContext): Promise<GitIssue>;
  createPullRequest(repo: string, input: { title: string; head: string; base: string; body: string }, context?: ExecutionContext): Promise<{ url: string; number: number }>;
}

export interface CommunicationProvider extends Provider {
  sendMessage(destination: string, message: string, context?: ExecutionContext): Promise<{ success: boolean; messageId: string }>;
  sendNotification(title: string, body: string, priority?: 'LOW' | 'NORMAL' | 'HIGH', context?: ExecutionContext): Promise<boolean>;
}

export interface WeatherInfo {
  location: string;
  temperatureC: number;
  condition: string;
  humidityPercent: number;
  windSpeedKmh: number;
}

export interface WeatherProvider extends Provider {
  getWeather(location: string, context?: ExecutionContext): Promise<WeatherInfo>;
}
