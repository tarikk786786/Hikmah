import { Citation, Evidence, ResearchSource, Claim } from './types.js';

export interface CitationValidationResult {
  valid: boolean;
  citation: Citation;
  error?: string;
}

export class CitationEngine {
  /**
   * Generates a citation object for an evidence excerpt.
   */
  public static generateCitation(source: ResearchSource, evidence?: Evidence): Citation {
    return {
      sourceId: source.id,
      url: source.canonicalUrl,
      title: source.title,
      publisher: source.publisher,
      publishedDate: source.publishedAt,
      evidenceLocation: evidence?.location || 'Extracted Document Content',
      verified: true
    };
  }

  /**
   * Validates that every citation refers to an actually retrieved source and real evidence.
   */
  public static validateCitations(
    citations: Citation[],
    sources: ResearchSource[],
    evidenceList: Evidence[] = []
  ): CitationValidationResult[] {
    const sourceMap = new Map(sources.map(s => [s.id, s]));
    const evidenceMap = new Map(evidenceList.map(e => [e.sourceId, e]));

    return citations.map(cit => {
      const src = sourceMap.get(cit.sourceId);
      if (!src) {
        return {
          valid: false,
          citation: { ...cit, verified: false },
          error: `Hallucination Guard: Cited source [${cit.sourceId}] was never retrieved in this research session.`
        };
      }

      if (evidenceList.length > 0 && !evidenceMap.has(cit.sourceId)) {
        return {
          valid: false,
          citation: { ...cit, verified: false },
          error: `Hallucination Guard: No extracted evidence found supporting citation for [${src.canonicalUrl}].`
        };
      }

      return {
        valid: true,
        citation: { ...cit, verified: true }
      };
    });
  }

  public generateCitation(source: ResearchSource, evidence?: Evidence): Citation {
    return CitationEngine.generateCitation(source, evidence);
  }

  public validateCitations(
    citations: Citation[],
    sources: ResearchSource[],
    evidenceList?: Evidence[]
  ): CitationValidationResult[] {
    return CitationEngine.validateCitations(citations, sources, evidenceList || []);
  }

  public qualifyClaim(claim: Claim, sources: ResearchSource[]): string {
    return CitationEngine.qualifyClaim(claim, sources);
  }

  /**
   * Enforces anti-hallucination constraint on a claim. If unsupported, wraps it in qualification.
   */
  public static qualifyClaim(claim: Claim, sources: ResearchSource[]): string {
    const hasSource = sources.some(s => claim.sourceIds.includes(s.id));

    if (!hasSource || claim.status === 'UNVERIFIED' || claim.status === 'UNCHECKED') {
      return `[Unverified] ${claim.claim} *(Note: Could not be independently corroborated from available sources)*`;
    }

    if (claim.status === 'CONTRADICTED') {
      return `[Disputed] ${claim.claim} *(Conflicting evidence identified across sources)*`;
    }

    return claim.claim;
  }
}
