import { ResearchEntity, TimelineEvent, EntityType, Evidence } from './types.js';

export class EntityExtractor {
  public extractEntities(corpusOrEvidence: any, sourceIds?: string[]): ResearchEntity[] {
    if (typeof corpusOrEvidence === 'string') {
      const ev: Evidence = {
        id: 'ev_temp',
        sourceId: sourceIds?.[0] || 'src_temp',
        sourceUrl: 'https://hikmah.local/evidence',
        contentHash: 'hash',
        text: corpusOrEvidence,
        confidence: 1.0,
        capturedAt: new Date().toISOString(),
      };
      return EntityExtractor.extractEntities([ev]);
    }
    return EntityExtractor.extractEntities(corpusOrEvidence);
  }

  /**
   * Identifies named entities across evidence chunks.
   */
  public static extractEntities(evidenceList: Evidence[]): ResearchEntity[] {
    const entityMap = new Map<string, ResearchEntity>();

    // Entity patterns
    const techPatterns = /\b(Python|TypeScript|React|Next\.js|PostgreSQL|Redis|Playwright|Docker|Supabase|Node\.js|Temporal|SearXNG)\b/g;
    const orgPatterns = /\b(OpenAI|Google|DeepMind|Anthropic|Microsoft|Meta|Mozilla|Vercel|Render|Apple)\b/g;

    for (const ev of evidenceList) {
      // Tech matches
      const techMatches = ev.text.matchAll(techPatterns);
      for (const m of techMatches) {
        const name = m[0];
        const id = `ent_tech_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!entityMap.has(id)) {
          entityMap.set(id, { id, name, type: 'TECHNOLOGY', aliases: [], sourceIds: [ev.sourceId] });
        } else {
          const ent = entityMap.get(id)!;
          if (!ent.sourceIds.includes(ev.sourceId)) ent.sourceIds.push(ev.sourceId);
        }
      }

      // Org matches
      const orgMatches = ev.text.matchAll(orgPatterns);
      for (const m of orgMatches) {
        const name = m[0];
        const id = `ent_org_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        if (!entityMap.has(id)) {
          entityMap.set(id, { id, name, type: 'ORGANIZATION', aliases: [], sourceIds: [ev.sourceId] });
        } else {
          const ent = entityMap.get(id)!;
          if (!ent.sourceIds.includes(ev.sourceId)) ent.sourceIds.push(ev.sourceId);
        }
      }
    }

    return Array.from(entityMap.values());
  }
}

export class TimelineEngine {
  public buildTimeline(evidenceList: any): TimelineEvent[] {
    return TimelineEngine.buildTimeline(evidenceList);
  }

  public extractTimeline(corpusOrEvidence: any, sourceIds?: string[]): TimelineEvent[] {
    if (typeof corpusOrEvidence === 'string') {
      const ev: Evidence = {
        id: 'ev_temp',
        sourceId: sourceIds?.[0] || 'src_temp',
        sourceUrl: 'https://hikmah.local/evidence',
        contentHash: 'hash',
        text: corpusOrEvidence,
        confidence: 1.0,
        capturedAt: new Date().toISOString(),
      };
      return TimelineEngine.buildTimeline([ev]);
    }
    return TimelineEngine.buildTimeline(corpusOrEvidence);
  }

  /**
   * Constructs chronological event sequences by extracting temporal dates from evidence.
   */
  public static buildTimeline(evidenceList: Evidence[]): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const dateRegex = /\b(19\d\d|20\d\d)(?:-(\d{2})(?:-(\d{2}))?)?\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d\d)\b/gi;

    for (const ev of evidenceList) {
      const matches = ev.text.matchAll(dateRegex);
      for (const m of matches) {
        const rawDate = m[0];
        // Parse into ISO date string if possible
        const parsed = new Date(rawDate);
        const isoDate = !isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : rawDate;

        // Context sentence around the date
        const sentences = ev.text.split(/(?<=[.?!])\s+/);
        const matchingSentence = sentences.find(s => s.includes(rawDate));

        if (matchingSentence && matchingSentence.length > 20) {
          const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          events.push({
            id: eventId,
            eventDate: isoDate,
            title: matchingSentence.slice(0, 60).trim() + '...',
            description: matchingSentence.trim(),
            sourceIds: [ev.sourceId],
            confidence: 0.85
          });
        }
      }
    }

    // Sort chronologically
    return events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }
}
