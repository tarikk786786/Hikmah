import { Capability } from './types.js';
import { RiskLevel } from '../safety/types.js';

export interface ScoringContext {
  query: string;
  intentCategory?: string;
  requiredInputKeys?: string[];
  maxRiskAllowed?: RiskLevel;
  preferredRuntime?: string;
}

export interface ScoredCapability {
  capability: Capability;
  score: number;
  factors: {
    relevance: number;
    compatibility: number;
    health: number;
    reliability: number;
    costPenalty: number;
    riskPenalty: number;
  };
}

export class CapabilityScorer {
  public score(capability: Capability, context: ScoringContext): ScoredCapability {
    // 1. Relevance: category match, tag match, keyword occurrence
    let relevance = 0.1;
    const q = context.query.toLowerCase();
    const qWords = q.split(/\s+/).filter(w => w.length > 2);
    const nameLower = capability.name.toLowerCase();
    const nameMatch = nameLower.includes(q) || q.includes(nameLower) || qWords.some(w => nameLower.includes(w));
    const descMatch = capability.description.toLowerCase().split(' ').some(w => w.length > 3 && q.includes(w));
    const tagMatch = capability.tags.some(t => q.includes(t.toLowerCase()) || qWords.includes(t.toLowerCase()));
    const catMatch = context.intentCategory ? capability.category.toLowerCase() === context.intentCategory.toLowerCase() : false;

    if (nameMatch) relevance += 0.4;
    if (descMatch) relevance += 0.2;
    if (tagMatch) relevance += 0.3;
    if (catMatch) relevance += 0.4;
    relevance = Math.min(1.0, relevance);

    // 2. Compatibility: schema matches required inputs
    let compatibility = 0.8;
    if (context.requiredInputKeys && capability.input_schema.properties) {
      const availableProps = Object.keys(capability.input_schema.properties as object);
      const matches = context.requiredInputKeys.filter(k => availableProps.includes(k));
      compatibility = matches.length / context.requiredInputKeys.length;
    }

    // 3. Health status multiplier
    let health = 1.0;
    switch (capability.health_status) {
      case 'HEALTHY': health = 1.0; break;
      case 'DEGRADED': health = 0.6; break;
      case 'REQUIRES_CONFIGURATION': health = 0.3; break;
      case 'UNAVAILABLE':
      case 'DISABLED': health = 0.0; break;
    }

    // 4. Reliability from retry policy
    const reliability = capability.retry_policy.maxRetries > 0 ? 0.95 : 0.8;

    // 5. Cost penalty
    const costPenalty = capability.cost_estimate ? capability.cost_estimate.estimatedCostPerCallUSD * 2.0 : 0.05;

    // 6. Risk penalty (High and critical are heavily penalized to avoid accidental high-risk selection)
    const riskPenalties: Record<RiskLevel, number> = {
      LOW: 0.02,
      MEDIUM: 0.15,
      HIGH: 0.45,
      CRITICAL: 0.90
    };
    const riskPenalty = riskPenalties[capability.risk_level] || 0.1;

    // Guardrail: if risk exceeds maximum allowed, zero out
    if (context.maxRiskAllowed) {
      const riskOrder: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      if (riskOrder[capability.risk_level] > riskOrder[context.maxRiskAllowed]) {
        return {
          capability,
          score: 0,
          factors: { relevance, compatibility, health: 0, reliability, costPenalty, riskPenalty: 1.0 }
        };
      }
    }

    // Cumulative multi-factor formula: (relevance * compatibility * health * reliability) - cost - risk
    const finalScore = (relevance * compatibility * health * reliability) - costPenalty - riskPenalty;

    return {
      capability,
      score: Math.max(0, finalScore),
      factors: {
        relevance,
        compatibility,
        health,
        reliability,
        costPenalty,
        riskPenalty
      }
    };
  }

  public rank(capabilities: Capability[], context: ScoringContext, limit: number = 5): ScoredCapability[] {
    return capabilities
      .filter(c => c.enabled && c.health_status !== 'UNAVAILABLE' && c.health_status !== 'DISABLED')
      .map(c => this.score(c, context))
      .filter(sc => sc.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
