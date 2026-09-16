export type WorkerType =
  | 'GENERAL'
  | 'RESEARCH'
  | 'BROWSER'
  | 'CODING'
  | 'DOCUMENT'
  | 'MEDIA'
  | 'SECURITY'
  | 'VOICE'
  | 'AUTOMATION'
  | 'NOTIFICATION';

export interface WorkerLease {
  taskId: string;
  workerId: string;
  workerType: WorkerType;
  leaseAcquiredAt: number;
  leaseExpiresAt: number;
  heartbeatAt: number;
}

export interface WorkerConfig {
  workerId: string;
  workerType: WorkerType;
  concurrencyLimit?: number;
  heartbeatIntervalMs?: number;
  leaseDurationMs?: number;
}
