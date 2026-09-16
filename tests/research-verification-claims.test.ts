import { describe, it, expect } from 'vitest';
import { SourceEvaluator, DuplicateStoryDetector, VerificationEngine } from '../research/core/verification-engine.js';
import { CitationEngine } from '../research/core/citation-engine.js';
import { ResearchSource, Citation } from '../research/core/types.js';

describe('PRD 11: Verification, Wire Syndication & Citation Engines', () => {
  it('should rank authority correctly based on domain classification', () => {
    expect(SourceEvaluator.evaluateAuthority('https://csrc.nist.gov/publications')).toBe(1);
    expect(SourceEvaluator.evaluateAuthority('https://mit.edu/csail')).toBe(2);
    expect(SourceEvaluator.evaluateAuthority('https://www.reuters.com/technology')).toBe(3);
    expect(SourceEvaluator.evaluateAuthority('https://github.com/nodejs/node')).toBe(3);
    expect(SourceEvaluator.evaluateAuthority('https://techcrunch.com/article')).toBe(5);
    expect(SourceEvaluator.evaluateAuthority('https://reddit.com/r/technology')).toBe(7);
  });

  it('should cluster identical syndicated wire stories to prevent circular consensus', () => {
    const detector = new DuplicateStoryDetector();

    const wireLead = 'WASHINGTON — The Federal Trade Commission announced sweeping new guidelines on artificial intelligence governance and model watermarking today.';

    // Source 1: AP News original
    const c1 = detector.registerStory('src_ap', 'FTC Announces AI Rules', `${wireLead} The regulations will take effect next quarter.`);
    // Source 2: Regional newspaper syndicating AP
    const c2 = detector.registerStory('src_regional', 'FTC Announces AI Rules', `${wireLead} Local tech businesses reacted cautiously.`);
    // Source 3: Completely independent reporting
    const c3 = detector.registerStory('src_independent', 'Analysis of FTC Directive', 'A completely different deep dive into administrative law precedents.');

    expect(c1.clusterId).toBe(c2.clusterId); // Syndicated stories share cluster
    expect(c1.isOriginalLead).toBe(true);
    expect(c2.isOriginalLead).toBe(false);
    expect(c3.clusterId).not.toBe(c1.clusterId);
  });

  it('should validate citations against retrieved sources enforcing anti-hallucination', () => {
    const citationEngine = new CitationEngine();

    const sources: ResearchSource[] = [
      {
        id: 'src_valid_1',
        url: 'https://rfc-editor.org/rfc/rfc9110',
        canonicalUrl: 'https://rfc-editor.org/rfc/rfc9110',
        urlHash: 'hash1',
        title: 'HTTP Semantics RFC 9110',
        sourceType: 'TECHNICAL',
        authority: 1,
        classification: 'PRIMARY',
        retrievedAt: new Date().toISOString(),
        contentHash: 'chash1',
      },
    ];

    const citations: Citation[] = [
      {
        sourceId: 'src_valid_1',
        url: 'https://rfc-editor.org/rfc/rfc9110',
        title: 'HTTP Semantics RFC 9110',
        verified: false,
      },
      {
        sourceId: 'src_hallucinated_unknown',
        url: 'https://fake-citation.com/nonexistent',
        title: 'Fabricated Citation',
        verified: false,
      },
    ];

    const validated = citationEngine.validateCitations(citations, sources);
    expect(validated[0].verified).toBe(true);
    expect(validated[1].verified).toBe(false);
  });
});
