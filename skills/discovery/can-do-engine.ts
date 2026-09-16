import { SkillCanDoAssessment } from '../manifests/types.js';
import { SkillDiscoveryEngine } from './discovery-engine.js';
import { SkillRegistry } from '../registry/skill-registry.js';

export class SkillCanDoEngine {
  private static instance: SkillCanDoEngine;
  private discovery: SkillDiscoveryEngine;
  private registry: SkillRegistry;

  constructor() {
    this.discovery = SkillDiscoveryEngine.getInstance();
    this.registry = SkillRegistry.getInstance();
  }

  public static getInstance(): SkillCanDoEngine {
    if (!SkillCanDoEngine.instance) {
      SkillCanDoEngine.instance = new SkillCanDoEngine();
    }
    return SkillCanDoEngine.instance;
  }

  /**
   * Evaluates if Hikmah can accomplish a natural language intent.
   */
  public evaluateIntent(intent: string): SkillCanDoAssessment {
    const searchResults = this.discovery.search(intent);
    const topMatches = searchResults.slice(0, 3);

    const hasMultiIntentConnector = /\b(and|then|also|followed by|plus)\b/i.test(intent);

    // Case 1: Multi-step composite match (connectors or multiple distinct skills)
    // E.g., user asks for "extract invoice from PDF and translate to Hindi"
    if (
      searchResults.length >= 2 &&
      (
        (hasMultiIntentConnector && searchResults[0].relevanceScore >= 0.3 && searchResults[1].relevanceScore >= 0.3) ||
        (searchResults[0].relevanceScore >= 0.35 && searchResults[1].relevanceScore >= 0.35 && searchResults[0].skill.id !== searchResults[1].skill.id && searchResults[0].relevanceScore < 0.8)
      )
    ) {
      const skillA = searchResults[0].skill;
      const skillB = searchResults[1].skill;

      return {
        intent,
        canDo: 'YES_COMPOSITION',
        confidence: 0.85,
        explanation: `Hikmah can accomplish this by composing multiple specialized skills: '${skillA.name}' and '${skillB.name}'.`,
        recommendedSkillIds: [skillA.id, skillB.id],
        compositionPlan: {
          steps: [
            {
              order: 1,
              capability: skillA.capabilities[0] || skillA.name,
              suggestedSkillId: skillA.id,
              status: 'AVAILABLE',
            },
            {
              order: 2,
              capability: skillB.capabilities[0] || skillB.name,
              suggestedSkillId: skillB.id,
              status: 'AVAILABLE',
            },
          ],
        },
        missingCapabilities: [],
      };
    }

    // Case 2: High-confidence direct single skill match
    if (topMatches.length > 0 && topMatches[0].relevanceScore >= 0.5) {
      const topSkill = topMatches[0].skill;
      return {
        intent,
        canDo: 'YES_EXISTING',
        confidence: topMatches[0].relevanceScore,
        explanation: `Hikmah can directly accomplish this using the '${topSkill.name}' skill (${topSkill.capabilities.join(', ')}).`,
        recommendedSkillIds: [topSkill.id],
        missingCapabilities: [],
      };
    }

    // Case 3: Partial or Generate missing glue
    if (searchResults.length === 1 && searchResults[0].relevanceScore >= 0.25) {
      const skill = searchResults[0].skill;
      return {
        intent,
        canDo: 'YES_CAN_GENERATE',
        confidence: 0.65,
        explanation: `Hikmah has base capabilities via '${skill.name}', and can generate the missing glue orchestration scripts to complete this task.`,
        recommendedSkillIds: [skill.id],
        compositionPlan: {
          steps: [
            {
              order: 1,
              capability: skill.capabilities[0] || skill.name,
              suggestedSkillId: skill.id,
              status: 'AVAILABLE',
            },
            {
              order: 2,
              capability: 'Custom Integration Glue',
              status: 'NEEDS_GENERATION',
            },
          ],
        },
        missingCapabilities: ['custom_workflow_glue'],
      };
    }

    // Case 4: No matching capabilities
    return {
      intent,
      canDo: 'NO',
      confidence: 0.1,
      explanation: `Hikmah currently does not possess installed skills or compatible marketplace tools for this specific capability.`,
      recommendedSkillIds: [],
      missingCapabilities: intent.toLowerCase().split(/\s+/).slice(0, 3),
    };
  }
}
