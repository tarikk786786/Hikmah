import { RiskLevel } from '../safety/types.js';

export type CapabilityType =
  | 'TOOL'
  | 'AGENT'
  | 'SKILL'
  | 'MODEL'
  | 'WORKFLOW'
  | 'MCP_SERVER'
  | 'STORAGE_PROVIDER'
  | 'VOICE_PROVIDER'
  | 'BROWSER_PROVIDER';

export type CapabilityCategory =
  | 'AI'
  | 'chat'
  | 'reasoning'
  | 'vision'
  | 'embeddings'
  | 'coding'
  | 'research'
  | 'search'
  | 'browser'
  | 'computer'
  | 'files'
  | 'documents'
  | 'storage'
  | 'database'
  | 'GitHub'
  | 'Git'
  | 'email'
  | 'calendar'
  | 'messaging'
  | 'voice'
  | 'image'
  | 'video'
  | 'automation'
  | 'OSINT'
  | 'security'
  | 'cloud'
  | 'network'
  | 'web-security'
  | 'API-security'
  | 'code-security'
  | 'container-security'
  | 'identity-security'
  | 'threat-intelligence'
  | 'defensive-security'
  | 'CTF/lab'
  | 'analytics'
  | 'translation'
  | 'notifications'
  | 'custom'
  | string; // arbitrary extensible future categories

export type HealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'DISABLED'
  | 'REQUIRES_CONFIGURATION';

export type RuntimeTarget =
  | 'VERCEL'
  | 'SUPABASE_EDGE'
  | 'RENDER'
  | 'DOCKER'
  | 'LOCAL'
  | 'FUTURE_REMOTE';

export type Permission =
  | 'READ_FILE'
  | 'WRITE_FILE'
  | 'DELETE_FILE'
  | 'NETWORK_ACCESS'
  | 'BROWSER_ACCESS'
  | 'DATABASE_READ'
  | 'DATABASE_WRITE'
  | 'GITHUB_READ'
  | 'GITHUB_WRITE'
  | 'SEND_MESSAGE'
  | 'RUN_CODE'
  | 'RUN_CONTAINER'
  | 'SECURITY_SCAN'
  | 'EXTERNAL_NETWORK_SCAN'
  | string;

export interface CapabilityRetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

export interface CapabilityCostEstimate {
  estimatedCostPerCallUSD: number;
  tokensPerCallEstimate?: number;
}

export interface Capability {
  id: string;
  name: string;
  version: string;
  category: CapabilityCategory;
  description: string;
  provider: string; // e.g., 'hikmah-native', 'openai', 'projectdiscovery', 'searxng'
  type: CapabilityType;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  permissions: Permission[];
  risk_level: RiskLevel;
  runtime: RuntimeTarget;
  supported_environments: string[]; // e.g., ['node', 'docker', 'browser']
  required_secrets?: string[]; // e.g., ['GITHUB_TOKEN', 'SHODAN_API_KEY']
  dependencies?: string[]; // other capability IDs
  timeout: number; // milliseconds
  retry_policy: CapabilityRetryPolicy;
  enabled: boolean;
  health_status: HealthStatus;
  cost_estimate?: CapabilityCostEstimate;
  tags: string[];
  documentation_url?: string;
  
  // Execution hook if directly invokable as a tool or action
  execute?: (input: Record<string, unknown>, context: any) => Promise<any>;
}

export interface CapabilityFilter {
  type?: CapabilityType;
  category?: CapabilityCategory;
  tags?: string[];
  maxRisk?: RiskLevel;
  enabledOnly?: boolean;
  healthyOnly?: boolean;
  runtime?: RuntimeTarget;
}
