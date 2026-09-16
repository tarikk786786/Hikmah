import { UniversalSkillManifest, SkillCategory, SkillRiskLevel, SkillCertificationStatus } from '../manifests/types.js';
import { SkillRegistry } from '../registry/skill-registry.js';

export interface SkillSearchFilters {
  categories?: SkillCategory[];
  riskLevels?: SkillRiskLevel[];
  certifications?: SkillCertificationStatus[];
  onlyInstalled?: boolean;
  requiresGpu?: boolean;
  noNetwork?: boolean;
  maxRiskLevel?: SkillRiskLevel;
  tags?: string[];
}

export interface SkillSearchResultItem {
  skill: UniversalSkillManifest;
  relevanceScore: number;
  matchedCapabilities: string[];
  matchedKeywords: string[];
  isInstalled: boolean;
}

export class SkillDiscoveryEngine {
  private static instance: SkillDiscoveryEngine;
  private registry: SkillRegistry;

  constructor() {
    this.registry = SkillRegistry.getInstance();
  }

  public static getInstance(): SkillDiscoveryEngine {
    if (!SkillDiscoveryEngine.instance) {
      SkillDiscoveryEngine.instance = new SkillDiscoveryEngine();
    }
    return SkillDiscoveryEngine.instance;
  }

  /**
   * Capability-oriented search matching natural language intent against skills.
   */
  public search(query: string, filters?: SkillSearchFilters): SkillSearchResultItem[] {
    const rawTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const candidateSkills = filters?.onlyInstalled 
      ? this.registry.listInstalledSkills() 
      : this.registry.listAllSkills();

    const results: SkillSearchResultItem[] = [];

    for (const skill of candidateSkills) {
      // 1. Filter checks
      if (filters?.categories && filters.categories.length > 0) {
        const matchesCategory = skill.categories.some(c => filters.categories!.includes(c));
        if (!matchesCategory) continue;
      }

      if (filters?.certifications && filters.certifications.length > 0) {
        if (!filters.certifications.includes(skill.certification)) continue;
      }

      if (filters?.requiresGpu !== undefined) {
        if (skill.hardware.gpu !== filters.requiresGpu) continue;
      }

      if (filters?.noNetwork) {
        if (skill.permissions.network.enabled) continue;
      }

      if (filters?.maxRiskLevel) {
        const riskOrder: Record<SkillRiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        if (riskOrder[skill.risk.level] > riskOrder[filters.maxRiskLevel]) continue;
      }

      // 2. Keyword and Capability Matching
      const matchedCapabilities: string[] = [];
      const matchedKeywords: string[] = [];

      const skillSearchableText = [
        skill.name,
        skill.description,
        skill.id,
        ...skill.categories,
        ...skill.tags,
        ...skill.capabilities,
        ...skill.tools,
      ].join(' ').toLowerCase();

      for (const token of rawTokens) {
        if (skillSearchableText.includes(token)) {
          matchedKeywords.push(token);
        }
      }

      for (const cap of skill.capabilities) {
        const capLower = cap.toLowerCase().replace(/_/g, ' ');
        if (rawTokens.some(t => capLower.includes(t)) || query.toLowerCase().includes(capLower)) {
          matchedCapabilities.push(cap);
        }
      }

      for (const tool of skill.tools) {
        if (query.toLowerCase().includes(tool.toLowerCase().split('.')[0])) {
          matchedCapabilities.push(tool);
        }
      }

      // 3. Compute relevance score (0.0 to 1.0)
      if (rawTokens.length === 0) {
        // No query, return all matching filters with base score
        results.push({
          skill,
          relevanceScore: 0.5,
          matchedCapabilities: [],
          matchedKeywords: [],
          isInstalled: this.registry.isInstalled(skill.id),
        });
        continue;
      }

      const keywordScore = rawTokens.length > 0 ? (matchedKeywords.length / rawTokens.length) : 0;
      const capabilityScore = Math.min(1.0, matchedCapabilities.length * 0.35);
      const isInstalled = this.registry.isInstalled(skill.id);
      const installedBonus = isInstalled ? 0.15 : 0;
      const verifiedBonus = skill.publisher.verified ? 0.1 : 0;

      const relevanceScore = Math.min(1.0, (capabilityScore * 0.45) + (keywordScore * 0.35) + installedBonus + verifiedBonus);

      if (relevanceScore > 0.1 || matchedKeywords.length > 0 || matchedCapabilities.length > 0) {
        results.push({
          skill,
          relevanceScore: Math.round(relevanceScore * 100) / 100,
          matchedCapabilities: Array.from(new Set(matchedCapabilities)),
          matchedKeywords: Array.from(new Set(matchedKeywords)),
          isInstalled,
        });
      }
    }

    // Sort descending by relevanceScore
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
