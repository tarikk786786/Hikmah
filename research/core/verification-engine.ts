import * as crypto from 'crypto';
import { Claim, Evidence, ResearchSource, SourceClassification, ClaimStatus } from './types.js';

export interface VerificationReport {
  claims: Claim[];
  clusteredStoryCount: number;
  conflicts: Array<{
    claim: string;
    supportingSourceIds: string[];
    contradictingSourceIds: string[];
    explanation: string;
  }>;
}

export class SourceEvaluator {
  /**
   * Classifies source authority and quality.
   */
  public static evaluate(sourceUrl: string, publisher?: string): {
    classification: SourceClassification;
    authority: number;
  } {
    const urlLower = sourceUrl.toLowerCase();

    // 1. Official Government & International Registries
    if (urlLower.includes('.gov') || urlLower.includes('.mil') || urlLower.includes('who.int') || urlLower.includes('un.org')) {
      return { classification: 'PRIMARY', authority: 1 };
    }

    // 2. Peer-Reviewed Academic & Standard Bodies
    if (urlLower.includes('arxiv.org') || urlLower.includes('doi.org') || urlLower.includes('ieee.org') || urlLower.includes('rfc-editor.org') || urlLower.includes('.edu')) {
      return { classification: 'PRIMARY', authority: 2 };
    }

    // 3. Official Corporate/Product Documentation & GitHub
    if (urlLower.includes('github.com') || urlLower.includes('docs.') || urlLower.includes('developer.')) {
      return { classification: 'PRIMARY', authority: 3 };
    }

    // 4. Established News & Editorial Media
    if (urlLower.includes('reuters.com') || urlLower.includes('apnews.com') || urlLower.includes('bbc.') || urlLower.includes('nature.com')) {
      return { classification: 'SECONDARY', authority: 4 };
    }

    // 5. Historical Web Archives
    if (urlLower.includes('web.archive.org')) {
      return { classification: 'ARCHIVED', authority: 5 };
    }

    // 6. Default / Web Blog / Aggregators
    return { classification: 'SECONDARY', authority: 6 };
  }

  public static evaluateAuthority(sourceUrl: string): number {
    return SourceEvaluator.evaluate(sourceUrl).authority;
  }

  public static classifySource(sourceUrl: string, authority?: number): SourceClassification {
    return SourceEvaluator.evaluate(sourceUrl).classification;
  }
}

export class DuplicateStoryDetector {
  private stories: Array<{ id: string; text: string }> = [];

  public registerStory(id: string, textOrTitle: string, maybeText?: string): { clusterId: string; isDuplicate: boolean } {
    const text = maybeText !== undefined ? maybeText : textOrTitle;
    this.stories.push({ id, text });
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 20).join(' ');
    const clusterId = crypto.createHash('sha256').update(words).digest('hex').slice(0, 16);
    const count = this.stories.filter((s) => {
      const w = s.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 20).join(' ');
      return crypto.createHash('sha256').update(w).digest('hex').slice(0, 16) === clusterId;
    }).length;
    return { clusterId, isDuplicate: count > 1 };
  }
  /**
   * Detects syndicated or republished stories by clustering similar texts,
   * ensuring repeated press releases do not get treated as independent corroborations.
   */
  public static clusterStories(sources: Array<{ id: string; text: string }>): Map<string, string[]> {
    const clusters: Map<string, string[]> = new Map(); // clusterKey -> sourceIds

    for (const s of sources) {
      // Create a fuzzy content signature (fingerprint first 20 words)
      const words = s.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 20).join(' ');
      const clusterKey = crypto.createHash('sha256').update(words).digest('hex').slice(0, 16);

      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(s.id);
    }

    return clusters;
  }
}

export class VerificationEngine {
  /**
   * Extracts factual claims from evidence, groups corroborating and conflicting sources,
   * and marks verification statuses.
   */
  public static verifyClaims(
    researchId: string,
    evidenceList: Evidence[],
    sources: ResearchSource[]
  ): VerificationReport {
    const claims: Claim[] = [];
    const conflicts: VerificationReport['conflicts'] = [];

    // Map sources for fast lookup
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    // Cluster duplicate stories
    const storyClusters = DuplicateStoryDetector.clusterStories(
      evidenceList.map(e => ({ id: e.sourceId, text: e.text }))
    );

    // Group evidence by sentence / claim
    evidenceList.forEach((ev, idx) => {
      const sentences = ev.text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 30);

      sentences.slice(0, 3).forEach((sentence, sIdx) => {
        const normalized = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const claimId = `clm_${researchId}_${idx}_${sIdx}`;

        // Check if an existing claim matches
        const existing = claims.find(c => c.normalizedClaim === normalized);
        if (existing) {
          if (!existing.supportingEvidenceIds.includes(ev.id)) {
            existing.supportingEvidenceIds.push(ev.id);
          }
          if (!existing.sourceIds.includes(ev.sourceId)) {
            existing.sourceIds.push(ev.sourceId);
          }

          // Corroboration: Check if source is in a distinct story cluster
          const distinctSources = new Set(existing.sourceIds);
          if (distinctSources.size >= 2) {
            existing.status = 'CORROBORATED';
            existing.confidence = Math.min(1.0, existing.confidence + 0.15);
          }
          return;
        }

        // New claim
        const source = sourceMap.get(ev.sourceId);
        const initialStatus: ClaimStatus = source && source.authority <= 3 ? 'SUPPORTED' : 'UNCHECKED';
        const baseConfidence = source ? (10 - source.authority) / 10 : 0.6;

        claims.push({
          id: claimId,
          researchId,
          claim: sentence.trim(),
          normalizedClaim: normalized,
          status: initialStatus,
          confidence: Math.max(0.5, Math.min(0.95, baseConfidence)),
          supportingEvidenceIds: [ev.id],
          contradictingEvidenceIds: [],
          sourceIds: [ev.sourceId],
          createdAt: new Date().toISOString()
        });
      });
    });

    // Detect contradictions: search for negation keywords
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const c1 = claims[i];
        const c2 = claims[j];

        const isNegation =
          (c1.normalizedClaim.includes(' not ') && !c2.normalizedClaim.includes(' not ')) ||
          (c2.normalizedClaim.includes(' not ') && !c1.normalizedClaim.includes(' not '));

        // Keyword overlap
        const words1 = new Set(c1.normalizedClaim.split(' ').filter(w => w.length > 4));
        const words2 = new Set(c2.normalizedClaim.split(' ').filter(w => w.length > 4));
        let common = 0;
        words1.forEach(w => { if (words2.has(w)) common++; });

        if (isNegation && common >= 2) {
          c1.status = 'CONTRADICTED';
          c2.status = 'CONTRADICTED';
          c1.contradictingEvidenceIds.push(...c2.supportingEvidenceIds);
          c2.contradictingEvidenceIds.push(...c1.supportingEvidenceIds);

          conflicts.push({
            claim: c1.claim,
            supportingSourceIds: c1.sourceIds,
            contradictingSourceIds: c2.sourceIds,
            explanation: `Contradiction detected with opposing statement: "${c2.claim}"`
          });
        }
      }
    }

    return {
      claims,
      clusteredStoryCount: storyClusters.size,
      conflicts
    };
  }
}
