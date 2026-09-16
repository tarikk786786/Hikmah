import { RiskLevel } from '../safety/types.js';
import { RuntimeTarget } from '../capabilities/types.js';

export type TaskState =
  | 'CREATED'
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING'
  | 'PAUSED'
  | 'WAITING_APPROVAL'
  | 'RETRYING'
  | 'PARTIAL'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'BLOCKED';

export type TaskPriority =
  | 'CRITICAL'   // 100
  | 'HIGH'       // 75
  | 'NORMAL'     // 50
  | 'LOW'        // 25
  | 'BACKGROUND';// 10

export type ErrorClass =
  | 'TRANSIENT'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'PROVIDER_FAILURE'
  | 'AUTHENTICATION'
  | 'VALIDATION'
  | 'PERMISSION'
  | 'RESOURCE'
  | 'PERMANENT';

export type BackoffStrategy = 'FIXED' | 'LINEAR' | 'EXPONENTIAL';

export type ApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'DENIED';

export interface TaskArtifact {
  id: string;
  name: string;
  type: string;
  url: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  summary: string;
  data?: unknown;
  artifacts?: TaskArtifact[];
  warnings?: string[];
  metrics?: Record<string, number>;
}

export interface TaskError {
  message: string;
  code?: string;
  classification: ErrorClass;
  retryable: boolean;
  stack?: string;
  failedAt: string;
}

export interface TaskCheckpoint {
  id: string;
  taskId: string;
  stepId: string;
  state: Record<string, unknown>;
  progress: number;
  partialResult?: unknown;
  cursor?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TaskApproval {
  id: string;
  taskId: string;
  requestedBy: string;
  requestedAt: string;
  riskLevel: RiskLevel;
  requiredRole?: string;
  approvedBy?: string;
  approvedAt?: string;
  status: ApprovalStatus;
  decisionReason?: string;
}

export interface Task {
  id: string;
  userId: string;
  projectId?: string;
  parentTaskId?: string;
  workflowId?: string;
  type: string;
  title: string;
  description?: string;
  input: Record<string, unknown>;
  status: TaskState;
  priority: TaskPriority;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  approvalId?: string;
  assignedWorker?: string;
  assignedRuntime?: RuntimeTarget;
  currentStep?: string;
  progress: number; // 0 to 100
  result?: TaskResult;
  error?: TaskError;
  retryCount: number;
  maxRetries: number;
  retryDelayMs: number;
  backoffStrategy: BackoffStrategy;
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  deadline?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskInput {
  userId?: string;
  projectId?: string;
  parentTaskId?: string;
  workflowId?: string;
  type: string;
  title: string;
  description?: string;
  input: Record<string, unknown>;
  priority?: TaskPriority;
  riskLevel?: RiskLevel;
  requiresApproval?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  backoffStrategy?: BackoffStrategy;
  deadline?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFilter {
  userId?: string;
  projectId?: string;
  workflowId?: string;
  status?: TaskState | TaskState[];
  type?: string;
  assignedWorker?: string;
  limit?: number;
  offset?: number;
}
