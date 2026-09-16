import { CapabilityRegistry } from './registry.js';
import { CapabilityScorer, ScoredCapability } from './scoring.js';
import { Capability } from './types.js';
import { RiskLevel } from '../safety/types.js';

export class ContextualCapabilityDiscovery {
  private registry: CapabilityRegistry;
  private scorer: CapabilityScorer;

  constructor(registry?: CapabilityRegistry, scorer?: CapabilityScorer) {
    this.registry = registry || CapabilityRegistry.getInstance();
    this.scorer = scorer || new CapabilityScorer();
  }

  public detectIntentCategory(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('pdf') || q.includes('document') || q.includes('extract text') || q.includes('docx') || q.includes('ocr')) {
      return 'documents';
    }
    if (q.includes('security') || q.includes('vulnerability') || q.includes('nmap') || q.includes('recon') || q.includes('pentest') || q.includes('ctf')) {
      return 'security';
    }
    if (q.includes('repo') || q.includes('repository') || q.includes('github') || q.includes('code') || q.includes('git') || q.includes('bug fix')) {
      return 'coding';
    }
    if (q.includes('browse') || q.includes('website') || q.includes('click') || q.includes('navigate') || q.includes('browser')) {
      return 'browser';
    }
    if (q.includes('search') || q.includes('who is') || q.includes('what is') || q.includes('research') || q.includes('find out')) {
      return 'search';
    }
    if (q.includes('calculate') || q.includes('math') || /^[0-9+\-*/().^% \t]+$/.test(q)) {
      return 'AI';
    }
    if (q.includes('remember') || q.includes('memory') || q.includes('recall') || q.includes('preference')) {
      return 'database';
    }

    return 'general';
  }

  public discoverRelevant(
    query: string,
    options?: {
      maxRisk?: RiskLevel;
      limit?: number;
    }
  ): {
    intentCategory: string;
    capabilities: Capability[];
    scored: ScoredCapability[];
  } {
    const intentCategory = this.detectIntentCategory(query);
    const allCapabilities = this.registry.list();

    const scored = this.scorer.rank(
      allCapabilities,
      {
        query,
        intentCategory,
        maxRiskAllowed: options?.maxRisk || 'HIGH'
      },
      options?.limit || 4
    );

    return {
      intentCategory,
      capabilities: scored.map(s => s.capability),
      scored
    };
  }
}
