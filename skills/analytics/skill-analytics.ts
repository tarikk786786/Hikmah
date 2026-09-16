import { SkillExecutionMetric } from '../manifests/types.js';

export interface SkillStats {
  skillId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageDurationMs: number;
  securityViolationsCount: number;
  lastExecutedAt?: string;
}

export class SkillAnalytics {
  private static instance: SkillAnalytics;
  private metrics: SkillExecutionMetric[] = [];

  public static getInstance(): SkillAnalytics {
    if (!SkillAnalytics.instance) {
      SkillAnalytics.instance = new SkillAnalytics();
    }
    return SkillAnalytics.instance;
  }

  public recordExecution(metric: SkillExecutionMetric): void {
    this.metrics.push(metric);
    // Keep reasonable bounded buffer (last 5,000 metrics)
    if (this.metrics.length > 5000) {
      this.metrics.shift();
    }
  }

  public getStats(skillId: string): SkillStats {
    const skillMetrics = this.metrics.filter(m => m.skillId === skillId);
    const totalExecutions = skillMetrics.length;

    if (totalExecutions === 0) {
      return {
        skillId,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 1.0,
        averageDurationMs: 0,
        securityViolationsCount: 0,
      };
    }

    const successCount = skillMetrics.filter(m => m.success).length;
    const failureCount = totalExecutions - successCount;
    const securityViolationsCount = skillMetrics.filter(m => m.securityViolation).length;
    const totalDuration = skillMetrics.reduce((sum, m) => sum + m.durationMs, 0);

    return {
      skillId,
      totalExecutions,
      successCount,
      failureCount,
      successRate: Math.round((successCount / totalExecutions) * 100) / 100,
      averageDurationMs: Math.round(totalDuration / totalExecutions),
      securityViolationsCount,
      lastExecutedAt: skillMetrics[skillMetrics.length - 1].timestamp,
    };
  }

  public getAllStats(): Record<string, SkillStats> {
    const skillIds = Array.from(new Set(this.metrics.map(m => m.skillId)));
    const out: Record<string, SkillStats> = {};
    for (const id of skillIds) {
      out[id] = this.getStats(id);
    }
    return out;
  }
}
