import { CircuitHealth, CircuitState } from './types.js';

export interface CircuitBreakerConfig {
  degradedThreshold?: number; // Failures to enter DEGRADED (default 1)
  failureThreshold?: number;  // Consecutive failures to trip to FAILED (default 3)
  cooldownMs?: number;        // Cooldown period in ms before RECOVERING (default 30000)
  recoverySuccessThreshold?: number; // Successes in RECOVERING to return to HEALTHY (default 2)
}

export class CircuitBreaker {
  private static instance: CircuitBreaker;
  private healthMap: Map<string, CircuitHealth> = new Map();
  private recoverySuccessMap: Map<string, number> = new Map();

  private config: Required<CircuitBreakerConfig>;

  constructor(config?: CircuitBreakerConfig) {
    this.config = {
      degradedThreshold: config?.degradedThreshold ?? 1,
      failureThreshold: config?.failureThreshold ?? 3,
      cooldownMs: config?.cooldownMs ?? 30000,
      recoverySuccessThreshold: config?.recoverySuccessThreshold ?? 2
    };
  }

  public static getInstance(config?: CircuitBreakerConfig): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker(config);
    }
    return CircuitBreaker.instance;
  }

  public getOrCreateHealth(providerId: string): CircuitHealth {
    let health = this.healthMap.get(providerId);
    if (!health) {
      health = {
        providerId,
        state: 'HEALTHY',
        failureCount: 0,
        consecutiveFailures: 0,
        successCount: 0
      };
      this.healthMap.set(providerId, health);
    }
    return health;
  }

  public canExecute(providerId: string): boolean {
    const health = this.getOrCreateHealth(providerId);

    if (health.state === 'DISABLED') {
      return false;
    }

    if (health.state === 'HEALTHY' || health.state === 'DEGRADED') {
      return true;
    }

    if (health.state === 'FAILED') {
      const now = Date.now();
      if (health.cooldownUntil && now >= health.cooldownUntil) {
        // Transition to half-open (RECOVERING)
        health.state = 'RECOVERING';
        this.recoverySuccessMap.set(providerId, 0);
        return true;
      }
      return false;
    }

    if (health.state === 'RECOVERING') {
      return true;
    }

    return false;
  }

  public recordSuccess(providerId: string): void {
    const health = this.getOrCreateHealth(providerId);
    health.successCount += 1;
    health.consecutiveFailures = 0;
    health.lastSuccessTime = Date.now();

    if (health.state === 'RECOVERING') {
      const currentSuccesses = (this.recoverySuccessMap.get(providerId) || 0) + 1;
      this.recoverySuccessMap.set(providerId, currentSuccesses);

      if (currentSuccesses >= this.config.recoverySuccessThreshold) {
        health.state = 'HEALTHY';
        health.cooldownUntil = undefined;
        this.recoverySuccessMap.delete(providerId);
      }
    } else if (health.state === 'DEGRADED') {
      health.state = 'HEALTHY';
    }
  }

  public recordFailure(providerId: string, error: Error | string): void {
    const health = this.getOrCreateHealth(providerId);
    health.failureCount += 1;
    health.consecutiveFailures += 1;
    health.lastFailureTime = Date.now();
    health.lastError = typeof error === 'string' ? error : error.message;

    if (health.state === 'RECOVERING') {
      // In recovery, any failure immediately trips back to FAILED
      health.state = 'FAILED';
      health.cooldownUntil = Date.now() + this.config.cooldownMs;
      this.recoverySuccessMap.delete(providerId);
      return;
    }

    if (health.consecutiveFailures >= this.config.failureThreshold) {
      health.state = 'FAILED';
      health.cooldownUntil = Date.now() + this.config.cooldownMs;
    } else if (health.consecutiveFailures >= this.config.degradedThreshold) {
      health.state = 'DEGRADED';
    }
  }

  public async executeWithBreaker<T>(providerId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute(providerId)) {
      const health = this.getOrCreateHealth(providerId);
      throw new Error(
        `Circuit breaker for provider [${providerId}] is OPEN (state: ${health.state}, consecutive failures: ${health.consecutiveFailures})`
      );
    }

    try {
      const result = await fn();
      this.recordSuccess(providerId);
      return result;
    } catch (err: unknown) {
      this.recordFailure(providerId, err as Error);
      throw err;
    }
  }

  public getHealth(providerId: string): CircuitHealth {
    return { ...this.getOrCreateHealth(providerId) };
  }

  public getAllHealth(): Record<string, CircuitHealth> {
    const result: Record<string, CircuitHealth> = {};
    for (const [k, v] of this.healthMap.entries()) {
      result[k] = { ...v };
    }
    return result;
  }

  public reset(providerId?: string): void {
    if (providerId) {
      this.healthMap.delete(providerId);
      this.recoverySuccessMap.delete(providerId);
    } else {
      this.healthMap.clear();
      this.recoverySuccessMap.clear();
    }
  }

  public disable(providerId: string): void {
    const health = this.getOrCreateHealth(providerId);
    health.state = 'DISABLED';
  }

  public enable(providerId: string): void {
    const health = this.getOrCreateHealth(providerId);
    health.state = 'HEALTHY';
    health.consecutiveFailures = 0;
  }
}
