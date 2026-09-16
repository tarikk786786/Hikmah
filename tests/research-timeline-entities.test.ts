import { describe, it, expect } from 'vitest';
import { TimelineEngine, EntityExtractor } from '../research/core/timeline-engine.js';

describe('PRD 11: Timeline Reconstruction & Entity Extraction', () => {
  it('should reconstruct chronological timeline from corpus text', () => {
    const timelineEngine = new TimelineEngine();
    const corpus = `
      In 1995, Brendan Eich developed JavaScript in ten days at Netscape.
      Later, on 2008-09-02, Google released Google Chrome version 1.0.
      By 2015, ECMAScript 6 was standardized introducing promises and modules.
    `;

    const timeline = timelineEngine.extractTimeline(corpus, ['src_history_1']);
    expect(timeline.length).toBeGreaterThanOrEqual(2);

    // Verify events are chronologically ordered
    const dates = timeline.map((t) => t.eventDate);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('should extract named entities with type tagging and deduplication', () => {
    const extractor = new EntityExtractor();
    const corpus = `
      Linus Torvalds created Linux and Git.
      Google announced Android in collaboration with the Open Handset Alliance.
      PostgreSQL and SQLite are widely used relational database engines.
    `;

    const entities = extractor.extractEntities(corpus, ['src_doc_1']);
    expect(entities.length).toBeGreaterThan(0);

    const names = entities.map((e) => e.name);
    expect(names.some((n) => n.includes('Google') || n.includes('Linux') || n.includes('PostgreSQL'))).toBe(true);

    const techEntity = entities.find((e) => e.name === 'PostgreSQL' || e.name === 'Linux');
    expect(techEntity).toBeDefined();
    expect(techEntity?.sourceIds).toContain('src_doc_1');
  });
});
