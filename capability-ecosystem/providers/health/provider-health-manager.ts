import { Provider, ProviderHealthReport, ProviderHealthStatus } from '../interfaces/provider.js';
import { ProviderCircuitBreaker } from '../circuit-breaker/provider-circuit-breaker.js';

export class ProviderHealthManager {
  private static instance: ProviderHealthManager;
  private reports: Map<string, ProviderHealthReport> = new Map();
  private circuitBreakers: Map<string, ProviderCircuitBreaker> = new Map();

  public static getInstance(): ProviderHealthManager {
    if (!ProviderHealthManager.instance) {
      ProviderHealthManager.instance = new ProviderHealthManager();
    }
    return ProviderHealthManager.instance;
  }

  public getCircuitBreaker(providerId: string): ProviderCircuitBreaker {
    let cb = this.circuitBreakers.get(providerId);
    if (!cb) {
      cb = new ProviderCircuitBreaker({ failureThreshold: 3, cooldownMs: 5000 });
      this.circuitBreakers.set(providerId, cb);
    }
    return cb;
  }

  public async checkHealth(provider: Provider): Promise<ProviderHealthReport> {
    const cb = this.getCircuitBreaker(provider.id);

    if (cb.getState() === 'OPEN') {
      const report: ProviderHealthReport = {
        status: 'UNAVAILABLE',
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 3,
        message: 'Circuit breaker is OPEN due to repeated failures.',
      };
      this.reports.set(provider.id, report);
      return report;
    }

    try {
      const report = await provider.health();
      if (report.status === 'HEALTHY' || report.status === 'DEGRADED') {
        cb.recordSuccess();
      } else {
        cb.recordFailure();
      }
      this.reports.set(provider.id, report);
      return report;
    } catch (err: any) {
      cb.recordFailure();
      const failReport: ProviderHealthReport = {
        status: 'UNAVAILABLE',
        latencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 1,
        message: err.message,
      };
      this.reports.set(provider.id, failReport);
      return failReport;
    }
  }

  public getCachedHealth(providerId: string): ProviderHealthReport | undefined {
    return this.reports.get(providerId);
  }

  public isAvailable(providerId: string): boolean {
    const cb = this.getCircuitBreaker(providerId);
    if (!cb.canExecute()) return false;
    const report = this.reports.get(providerId);
    return !report || report.status === 'HEALTHY' || report.status === 'DEGRADED';
  }
}
