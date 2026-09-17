export interface AIProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'hybrid' | 'offline';
  status: 'active' | 'degraded' | 'unavailable';
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  capabilities: string[];
  contextWindow: number;
  costPer1kTokens?: number;
}

export interface AIAgent {
  id: string;
  type: string;
  name: string;
  description: string;
  maturity: 'DISCOVERED' | 'DRAFT' | 'TESTING' | 'VERIFIED' | 'ACTIVE' | 'DEGRADED' | 'SUSPENDED' | 'RETIRED';
  capabilities: string[];
  permissions: string[];
  owner: string;
}

export interface AITool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  providerId?: string;
}

export interface AISkill {
  id: string;
  name: string;
  description: string;
  tools: AITool[];
}

export interface AIArtifact {
  id: string;
  type: string;
  source: string;
  creator: string;
  timestamp: string;
  version: string;
  provenance: Record<string, any>;
}

export interface AIKnowledge {
  id: string;
  type: 'note' | 'entity' | 'relationship' | 'document' | 'canvas';
  title: string;
  created: string;
  updated: string;
  tags: string[];
  source?: string;
  confidence: number;
  privacy: 'public' | 'private' | 'restricted';
}
