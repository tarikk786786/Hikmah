export type ResearchMode = 'QUICK' | 'STANDARD' | 'DEEP' | 'INVESTIGATION' | 'MONITOR';

export type SearchIntent =
  | 'GENERAL'
  | 'NEWS'
  | 'ACADEMIC'
  | 'TECHNICAL'
  | 'GOVERNMENT'
  | 'COMMERCE'
  | 'SOCIAL'
  | 'GITHUB'
  | 'HISTORICAL';

export type SourceClassification =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'TERTIARY'
  | 'USER_PROVIDED'
  | 'ARCHIVED'
  | 'UNVERIFIED';

export type ClaimStatus =
  | 'UNCHECKED'
  | 'SUPPORTED'
  | 'CORROBORATED'
  | 'CONTRADICTED'
  | 'UNVERIFIED'
  | 'OUTDATED';

export type EntityType =
  | 'PERSON'
  | 'COMPANY'
  | 'ORGANIZATION'
  | 'PROJECT'
  | 'PRODUCT'
  | 'TECHNOLOGY'
  | 'LOCATION'
  | 'DOCUMENT'
  | 'EVENT'
  | 'REPOSITORY';

export interface ResearchBudget {
  maxQueries: number;
  maxPages: number;
  maxBytes: number;
  maxRuntimeMs: number;
  maxAiCalls: number;
}

export interface ResearchSource {
  id: string;
  url: string;
  canonicalUrl: string;
  urlHash: string;
  title: string;
  publisher?: string;
  author?: string;
  sourceType: SearchIntent;
  authority: number; // 1 (highest/official) to 10 (unverified forum)
  classification: SourceClassification;
  publishedAt?: string;
  updatedAt?: string;
  retrievedAt: string;
  language?: string;
  contentHash: string;
  snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  claimId?: string;
  sourceId: string;
  sourceUrl?: string;
  text: string;
  location?: string;
  pageNumber?: number;
  section?: string;
  timestampSeconds?: number;
  contentHash: string;
  capturedAt?: string;
  confidence: number; // 0.0 to 1.0
}

export interface Claim {
  id: string;
  researchId: string;
  claim: string;
  normalizedClaim: string;
  status: ClaimStatus;
  confidence: number;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  sourceIds: string[];
  limitations?: string;
  createdAt: string;
}

export interface ResearchEntity {
  id: string;
  name: string;
  type: EntityType;
  aliases: string[];
  sourceIds: string[];
  attributes?: Record<string, unknown>;
}

export interface TimelineEvent {
  id: string;
  entityId?: string;
  eventDate: string;
  title: string;
  description: string;
  sourceIds: string[];
  confidence: number;
}

export interface Citation {
  sourceId: string;
  url: string;
  title: string;
  publisher?: string;
  publishedDate?: string;
  evidenceLocation?: string;
  verified: boolean;
}

export interface ResearchReport {
  id: string;
  researchId: string;
  question: string;
  mode: ResearchMode;
  summary: string;
  methodology: string;
  sources: ResearchSource[];
  claims: Claim[];
  conflicts: {
    claim: string;
    supportingSourceIds: string[];
    contradictingSourceIds: string[];
    explanation: string;
  }[];
  timeline: TimelineEvent[];
  limitations: string[];
  citations: Citation[];
  markdown: string;
  createdAt: string;
}

export interface ResearchTask {
  id: string;
  question: string;
  mode: ResearchMode;
  status: 'PENDING' | 'SEARCHING' | 'FETCHING' | 'EXTRACTING' | 'VERIFYING' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
  budget: ResearchBudget;
  progressPercent: number;
  userId: string;
  projectId?: string;
  report?: ResearchReport;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  canonicalUrl: string;
  snippet: string;
  domain: string;
  publisher?: string;
  publishedAt?: string;
  sourceType: SearchIntent;
  score: number;
}

export interface FetchResult {
  url: string;
  canonicalUrl: string;
  status: number;
  contentType: string;
  html?: string;
  text?: string;
  sizeBytes: number;
  retrievedAt: string;
  headers?: Record<string, string>;
  isStatic: boolean;
}

export type MonitorChangeType = 'NEW' | 'CHANGED' | 'REMOVED' | 'UNCHANGED';

export interface ResearchMonitorJob {
  id: string;
  title: string;
  query?: string;
  targetUrls: string[];
  frequencyMinutes: number;
  lastRunAt?: string;
  nextRunAt?: string;
  lastSnapshotHash?: string;
  active: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchMonitorDiff {
  id: string;
  monitorId: string;
  detectedAt: string;
  changeType: MonitorChangeType;
  url: string;
  title: string;
  previousHash?: string;
  newHash?: string;
  diffSummary: string;
  addedContent?: string[];
  removedContent?: string[];
}

