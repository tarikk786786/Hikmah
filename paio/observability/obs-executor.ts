/**
 * Canonical Observability Interface for Hikmah
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  name: string;
  startTimeMs: number;
  endTimeMs?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'OK' | 'ERROR';
}

export interface IObservabilityProvider {
  providerId: string;
  
  initialize(): Promise<void>;
  
  startSpan(name: string, attributes?: Record<string, any>): TraceSpan;
  
  endSpan(span: TraceSpan, status?: 'OK' | 'ERROR'): void;
  
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  
  flush(): Promise<void>;
}
