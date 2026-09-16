export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';

export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'blocked'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'BLOCKED'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | string;

export interface TaskResourceLimits {
  maxRuntimeSeconds?: number;
  maxSteps?: number;
  maxToolCalls?: number;
  maxTokens?: number;
  maxCostUsd?: number;
}

export interface AgentTask {
  taskId: string;
  id?: string;
  title?: string;
  parentTaskId?: string;
  workflowId: string;
  objective: string;
  agentType: string;
  assignedAgent?: string;
  capability: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[]; // List of prerequisite taskIds
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  output?: Record<string, unknown>;
  artifacts?: string[]; // IDs of generated artifacts
  evidence?: string[]; // IDs of gathered evidence
  constraints?: Record<string, unknown>;
  policyContext?: string;
  resourceLimits: TaskResourceLimits;
  retries: number;
  maxRetries: number;
  tokensUsed?: number;
  costUSD?: number;
  description?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  assignedAgentId?: string;
}

export interface GraphNode {
  id: string;
  task: AgentTask;
  isApprovalNode?: boolean;
  isVerificationNode?: boolean;
  conditionalExpression?: string;
}

export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  condition?: (outputs: Record<string, unknown>) => boolean;
}

export interface TaskGraph {
  workflowId: string;
  goal: string;
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface AgentDefinition {
  agentId: string;
  id?: string;
  name: string;
  version?: string;
  type?: string;
  description: string;
  capabilities?: string[];
  supportedInputs?: string[];
  supportedOutputs?: string[];
  requiredTools?: string[];
  allowedTools?: string[];
  modelTier?: string;
  requiredPermissions?: string[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  modelRequirements?: string[];
  resourceLimits?: TaskResourceLimits;
  policyId?: string;
  isAvailable?: boolean;
}

export interface AgentHandoff {
  handoffId: string;
  workflowId: string;
  fromAgent: string;
  toAgent: string;
  taskId: string;
  summary: string;
  artifacts: string[];
  evidence: string[];
  openQuestions: string[];
  constraints: Record<string, unknown>;
  timestamp: string;
}

export interface CriticIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  type: 'FACTUAL_ACCURACY' | 'MISSING_EVIDENCE' | 'CONTRADICTION' | 'POLICY_VIOLATION' | 'INSTRUCTION_INCOMPLETE';
  description: string;
  suggestedAction: string;
}

export interface CriticReviewResult {
  status: 'PASS' | 'REVISE' | 'FAIL';
  confidenceScore: number; // 0.0 - 1.0
  issues: CriticIssue[];
  missingEvidence: string[];
  requiredActions: string[];
  reviewedAt: string;
}

export interface SynthesisResult {
  synthesisId: string;
  workflowId: string;
  summary: string;
  finalAnswer: string;
  verifiedEvidence: string[];
  citations: Array<{ source: string; claim: string; confidence: number }>;
  artifacts: string[];
  completedAt: string;
}

export interface AgentLease {
  leaseId: string;
  resourceId: string; // e.g. "repo:ASTRO360" or "browser:profile-1"
  resourceType?: string;
  agentId: string;
  holderAgentId?: string;
  workflowId: string;
  leaseType?: string;
  acquiredAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED';
}

export interface WorkflowPlan {
  planId: string;
  goal: string;
  estimatedComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'MISSION_CRITICAL';
  estimatedRuntimeSeconds: number;
  estimatedCostUsd: number;
  tasks: AgentTask[];
  dependencies: Array<{ from: string; to: string }>;
  requiredCapabilities: string[];
  suggestedAgents: string[];
  createdAt: string;
}

export type WorkflowTask = AgentTask;

export interface WorkflowRun {
  id: string;
  goal: string;
  status: string;
  priority: string;
  tasks: WorkflowTask[];
  costUSD: number;
  tokensUsed: number;
  budgetLimitUSD: number;
  tokenBudget: number;
  finalResult?: any;
}

export interface AgentArtifact {
  id?: string;
  artifactId?: string;
  workflowId?: string;
  workflowRunId?: string;
  name: string;
  type: string;
  sizeBytes: number;
  producerAgent?: string;
  storageKey?: string;
}


