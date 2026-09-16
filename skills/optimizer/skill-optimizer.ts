import { SkillAnalytics } from '../analytics/skill-analytics.js';
import { SkillRegistry } from '../registry/skill-registry.js';

export interface SkillOptimizationRecommendation {
  skillId: string;
  type: 'UPGRADE' | 'REPLACE' | 'REVIEW_PERMISSIONS' | 'QUARANTINE';
  reason: string;
  suggestedAction: string;
  suggestedAlternativeSkillId?: string;
}

export class SkillOptimizer {
  private static instance: SkillOptimizer;
  private analytics: SkillAnalytics;
  private registry: SkillRegistry;

  constructor() {
    this.analytics = SkillAnalytics.getInstance();
    this.registry = SkillRegistry.getInstance();
  }

  public static getInstance(): SkillOptimizer {
    if (!SkillOptimizer.instance) {
      SkillOptimizer.instance = new SkillOptimizer();
    }
    return SkillOptimizer.instance;
  }

  public analyzeInstalledSkills(): SkillOptimizationRecommendation[] {
    const installed = this.registry.listInstalledSkills();
    const recommendations: SkillOptimizationRecommendation[] = [];

    for (const skill of installed) {
      const stats = this.analytics.getStats(skill.id);

      // Check for security violations
      if (stats.securityViolationsCount > 0) {
        recommendations.push({
          skillId: skill.id,
          type: 'QUARANTINE',
          reason: `Skill accumulated ${stats.securityViolationsCount} runtime security violation(s).`,
          suggestedAction: 'Immediately quarantine skill and inspect runtime logs.',
        });
      }

      // Check for low success rate (< 70% with at least 5 executions)
      if (stats.totalExecutions >= 5 && stats.successRate < 0.7) {
        recommendations.push({
          skillId: skill.id,
          type: 'REPLACE',
          reason: `High failure rate detected (${Math.round((1 - stats.successRate) * 100)}% failure across ${stats.totalExecutions} executions).`,
          suggestedAction: 'Consider replacing this skill with a verified alternative or rolling back to an earlier version.',
        });
      }

      // Check for available updates in available skills catalog
      const available = this.registry.getSkill(skill.id);
      if (available && available.version !== skill.version) {
        recommendations.push({
          skillId: skill.id,
          type: 'UPGRADE',
          reason: `Newer version available (${available.version}) than currently installed (${skill.version}).`,
          suggestedAction: `Update skill from v${skill.version} to v${available.version}.`,
        });
      }
    }

    return recommendations;
  }
}
