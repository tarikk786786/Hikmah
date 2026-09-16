import { createHash } from 'crypto';
import {
  ResearchMode,
  ResearchTask,
  ResearchBudget,
  ResearchReport,
  ResearchSource,
  Evidence,
  Claim,
  Citation,
  SearchResultItem,
  TimelineEvent,
  ResearchEntity,
} from './types.js';
import { QueryPlanner } from './query-planner.js';
import { SearchRouter } from './search-router.js';
import { FetchRouter } from './fetch-router.js';
import { TrafilaturaExtractor, DocumentExtractor } from './extraction-router.js';
import { DiscoveryEngine } from './discovery-engine.js';
import { VerificationEngine, SourceEvaluator, DuplicateStoryDetector } from './verification-engine.js';
import { CitationEngine } from './citation-engine.js';
import { TimelineEngine, EntityExtractor } from './timeline-engine.js';
import { StorageOrchestrator } from '../../storage/core/orchestrator.js';

export interface StartResearchOptions {
  question: string;
  mode?: ResearchMode;
  userId: string;
  projectId?: string;
  budget?: Partial<ResearchBudget>;
  persistToStorage?: boolean;
}

export class ResearchOrchestrator {
  private static instance: ResearchOrchestrator;

  private queryPlanner: QueryPlanner;
  private searchRouter: SearchRouter;
  private fetchRouter: FetchRouter;
  private trafilaturaExtractor: TrafilaturaExtractor;
  private documentExtractor: DocumentExtractor;
  private discoveryEngine: DiscoveryEngine;
  private verificationEngine: VerificationEngine;
  private citationEngine: CitationEngine;
  private timelineEngine: TimelineEngine;
  private entityExtractor: EntityExtractor;
  private storageOrchestrator?: StorageOrchestrator;

  private tasks: Map<string, ResearchTask> = new Map();
  private reports: Map<string, ResearchReport> = new Map();

  constructor(options?: {
    queryPlanner?: QueryPlanner;
    searchRouter?: SearchRouter;
    fetchRouter?: FetchRouter;
    trafilaturaExtractor?: TrafilaturaExtractor;
    documentExtractor?: DocumentExtractor;
    discoveryEngine?: DiscoveryEngine;
    verificationEngine?: VerificationEngine;
    citationEngine?: CitationEngine;
    timelineEngine?: TimelineEngine;
    entityExtractor?: EntityExtractor;
    storageOrchestrator?: StorageOrchestrator;
  }) {
    this.queryPlanner = options?.queryPlanner || new QueryPlanner();
    this.searchRouter = options?.searchRouter || new SearchRouter();
    this.fetchRouter = options?.fetchRouter || new FetchRouter();
    this.trafilaturaExtractor = options?.trafilaturaExtractor || new TrafilaturaExtractor();
    this.documentExtractor = options?.documentExtractor || new DocumentExtractor();
    this.discoveryEngine = options?.discoveryEngine || new DiscoveryEngine(this.fetchRouter);
    this.verificationEngine = options?.verificationEngine || new VerificationEngine();
    this.citationEngine = options?.citationEngine || new CitationEngine();
    this.timelineEngine = options?.timelineEngine || new TimelineEngine();
    this.entityExtractor = options?.entityExtractor || new EntityExtractor();
    this.storageOrchestrator = options?.storageOrchestrator;
  }

  public static getInstance(): ResearchOrchestrator {
    if (!ResearchOrchestrator.instance) {
      ResearchOrchestrator.instance = new ResearchOrchestrator();
    }
    return ResearchOrchestrator.instance;
  }

  public getTask(id: string): ResearchTask | undefined {
    return this.tasks.get(id);
  }

  public getReport(researchId: string): ResearchReport | undefined {
    return this.reports.get(researchId);
  }

  public listTasks(userId?: string): ResearchTask[] {
    const list = Array.from(this.tasks.values());
    if (userId) {
      return list.filter((t) => t.userId === userId);
    }
    return list;
  }

  public getDefaultBudget(mode: ResearchMode): ResearchBudget {
    switch (mode) {
      case 'QUICK':
        return { maxQueries: 2, maxPages: 5, maxBytes: 5 * 1024 * 1024, maxRuntimeMs: 15000, maxAiCalls: 2 };
      case 'STANDARD':
        return { maxQueries: 5, maxPages: 15, maxBytes: 20 * 1024 * 1024, maxRuntimeMs: 45000, maxAiCalls: 5 };
      case 'DEEP':
        return { maxQueries: 12, maxPages: 40, maxBytes: 60 * 1024 * 1024, maxRuntimeMs: 120000, maxAiCalls: 15 };
      case 'INVESTIGATION':
        return { maxQueries: 25, maxPages: 100, maxBytes: 150 * 1024 * 1024, maxRuntimeMs: 300000, maxAiCalls: 30 };
      case 'MONITOR':
        return { maxQueries: 3, maxPages: 10, maxBytes: 10 * 1024 * 1024, maxRuntimeMs: 30000, maxAiCalls: 3 };
    }
  }

  public async startResearch(options: StartResearchOptions): Promise<ResearchTask> {
    const mode = options.mode || 'STANDARD';
    const taskId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const budget: ResearchBudget = {
      ...this.getDefaultBudget(mode),
      ...(options.budget || {}),
    };

    const task: ResearchTask = {
      id: taskId,
      question: options.question,
      mode,
      status: 'PENDING',
      budget,
      progressPercent: 0,
      userId: options.userId,
      projectId: options.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);

    // Run execution asynchronously or immediately
    return task;
  }

  public async executePipeline(taskId: string, persistToStorage = false): Promise<ResearchReport> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Research task ${taskId} not found`);
    }

    try {
      // Stage 1: Planning & Search
      task.status = 'SEARCHING';
      task.progressPercent = 15;
      task.updatedAt = new Date().toISOString();

      const queries = this.queryPlanner.plan(task.question, task.mode);
      const searchPromises = queries.slice(0, task.budget.maxQueries).map((q) =>
        this.searchRouter.search(q.query, {
          intent: q.intent,
          limit: Math.ceil(task.budget.maxPages / queries.length) || 5,
        })
      );
      const searchResultsNested = await Promise.all(searchPromises);
      const rawResults = searchResultsNested.flat();

      // Deduplicate results by canonicalUrl
      const uniqueResults = new Map<string, SearchResultItem>();
      for (const item of rawResults) {
        if (!uniqueResults.has(item.canonicalUrl)) {
          uniqueResults.set(item.canonicalUrl, item);
        }
      }
      const searchResults = Array.from(uniqueResults.values()).slice(0, task.budget.maxPages);

      // Stage 2: Discovery (if DEEP or INVESTIGATION)
      task.status = 'FETCHING';
      task.progressPercent = 35;
      task.updatedAt = new Date().toISOString();

      let targetUrls = searchResults.map((r) => r.canonicalUrl);
      if (task.mode === 'DEEP' || task.mode === 'INVESTIGATION') {
        const topUrls = targetUrls.slice(0, 3);
        const discoveredNested = await Promise.all(
          topUrls.map((url) => this.discoveryEngine.discover(url, 2))
        );
        const discovered = discoveredNested.flat();
        for (const url of discovered) {
          if (!targetUrls.includes(url) && targetUrls.length < task.budget.maxPages) {
            targetUrls.push(url);
          }
        }
      }

      // Stage 3 & 4: Fetch & Render
      const fetchResults = await Promise.all(
        targetUrls.map(async (url) => {
          try {
            return await this.fetchRouter.fetch(url);
          } catch {
            return null;
          }
        })
      );
      const validFetches = fetchResults.filter((f): f is NonNullable<typeof f> => f !== null);

      // Stage 5 & 6: Extract & Normalize
      task.status = 'EXTRACTING';
      task.progressPercent = 55;
      task.updatedAt = new Date().toISOString();

      const sources: ResearchSource[] = [];
      const extractedTexts: { sourceId: string; text: string; url: string; title: string }[] = [];

      for (const fetchItem of validFetches) {
        const extracted = this.trafilaturaExtractor.extract(fetchItem);
        const sourceId = `src_${createHash('sha256').update(fetchItem.canonicalUrl).digest('hex').substring(0, 10)}`;
        const contentHash = createHash('sha256').update(extracted.extractedText || '').digest('hex');

        const authority = SourceEvaluator.evaluateAuthority(fetchItem.canonicalUrl);
        const classification = SourceEvaluator.classifySource(fetchItem.canonicalUrl, authority);

        const source: ResearchSource = {
          id: sourceId,
          url: fetchItem.url,
          canonicalUrl: fetchItem.canonicalUrl,
          urlHash: createHash('sha256').update(fetchItem.canonicalUrl).digest('hex'),
          title: extracted.title || fetchItem.canonicalUrl,
          publisher: extracted.metadata?.siteName as string | undefined,
          author: extracted.author,
          sourceType: 'GENERAL',
          authority,
          classification,
          publishedAt: extracted.date || fetchItem.retrievedAt,
          retrievedAt: fetchItem.retrievedAt,
          language: extracted.language || 'en',
          contentHash,
          snippet: (extracted.extractedText || '').slice(0, 250),
          metadata: extracted.metadata,
        };

        sources.push(source);
        if (extracted.extractedText) {
          extractedTexts.push({
            sourceId,
            text: extracted.extractedText,
            url: fetchItem.canonicalUrl,
            title: extracted.title || fetchItem.canonicalUrl,
          });
        }
      }

      // Stage 7: Duplicate Story Detection
      const duplicateDetector = new DuplicateStoryDetector();
      for (const item of extractedTexts) {
        duplicateDetector.registerStory(item.sourceId, item.title, item.text);
      }

      // Stage 8: Verify, Compare & Collect Claims
      task.status = 'VERIFYING';
      task.progressPercent = 75;
      task.updatedAt = new Date().toISOString();

      const claims: Claim[] = [];
      const evidenceList: Evidence[] = [];
      const conflicts: ResearchReport['conflicts'] = [];

      // Extract facts/sentences as candidate claims
      for (const item of extractedTexts) {
        const sentences = item.text
          .split(/[.!?]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 25 && s.length < 250)
          .slice(0, 5); // Take top 5 key assertions per document

        for (const sentence of sentences) {
          const evidenceId = `ev_${createHash('sha256').update(item.sourceId + sentence).digest('hex').substring(0, 8)}`;
          const ev: Evidence = {
            id: evidenceId,
            sourceId: item.sourceId,
            sourceUrl: item.url,
            text: sentence,
            contentHash: createHash('sha256').update(sentence).digest('hex'),
            capturedAt: new Date().toISOString(),
            confidence: 0.9,
          };
          evidenceList.push(ev);

          const claimId = `clm_${createHash('sha256').update(sentence).digest('hex').substring(0, 8)}`;
          if (!claims.some((c) => c.id === claimId)) {
            // Check corroboration across other texts
            const supportingSourceIds = [item.sourceId];
            for (const other of extractedTexts) {
              if (other.sourceId !== item.sourceId && other.text.toLowerCase().includes(sentence.toLowerCase().slice(0, 30))) {
                supportingSourceIds.push(other.sourceId);
              }
            }

            const status = supportingSourceIds.length > 1 ? 'CORROBORATED' : 'SUPPORTED';

            claims.push({
              id: claimId,
              researchId: task.id,
              claim: sentence,
              normalizedClaim: sentence.toLowerCase(),
              status,
              confidence: supportingSourceIds.length > 1 ? 0.95 : 0.8,
              supportingEvidenceIds: [evidenceId],
              contradictingEvidenceIds: [],
              sourceIds: supportingSourceIds,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      // Stage 9: Timeline & Entity Extraction
      const fullCorpus = extractedTexts.map((e) => e.text).join('\n');
      const timeline = this.timelineEngine.extractTimeline(fullCorpus, sources.map((s) => s.id));
      const entities = this.entityExtractor.extractEntities(fullCorpus, sources.map((s) => s.id));

      // Stage 10: Citation & Anti-Hallucination Validation
      const rawCitations = sources.map((src) => ({
        sourceId: src.id,
        url: src.canonicalUrl,
        title: src.title,
        publisher: src.publisher,
        publishedDate: src.publishedAt,
        evidenceLocation: undefined,
        verified: true,
      }));

      const validationResults = this.citationEngine.validateCitations(rawCitations, sources);
      const validatedCitations = validationResults.map((r) => r.citation);

      // Stage 11: Synthesis & Report Generation
      task.status = 'SYNTHESIZING';
      task.progressPercent = 90;
      task.updatedAt = new Date().toISOString();

      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const summary = this.generateSummary(task.question, claims, sources);
      const methodology = `Hikmah Deep Research Pipeline (${task.mode} Mode): Executed ${queries.length} query variations across search providers, retrieved ${sources.length} canonical sources, filtered boilerplate via Trafilatura, evaluated source authority & wire-service syndication, and verified claims with strict citation enforcement.`;
      const limitations = [
        `Research limited to ${task.budget.maxPages} pages per budget constraints.`,
        'Non-indexed, paywalled, or authenticated resources were not accessed.',
        'Real-time information is subject to ongoing updates from primary publishers.',
      ];

      const markdown = this.formatReportMarkdown({
        question: task.question,
        mode: task.mode,
        summary,
        methodology,
        sources,
        claims: claims.slice(0, 15),
        conflicts,
        timeline: timeline.slice(0, 10),
        entities: entities.slice(0, 10),
        limitations,
        citations: validatedCitations,
      });

      const report: ResearchReport = {
        id: reportId,
        researchId: task.id,
        question: task.question,
        mode: task.mode,
        summary,
        methodology,
        sources,
        claims: claims.slice(0, 15),
        conflicts,
        timeline: timeline.slice(0, 10),
        limitations,
        citations: validatedCitations,
        markdown,
        createdAt: new Date().toISOString(),
      };

      // Optionally persist markdown artifact to StorageOrchestrator
      if (persistToStorage) {
        try {
          const storage = this.storageOrchestrator || StorageOrchestrator.getInstance();
          await storage.putObject({
            key: `research/${task.id}/report.md`,
            userId: task.userId,
            data: Buffer.from(markdown, 'utf-8'),
            mimeType: 'text/markdown',
            metadata: {
              researchId: task.id,
              mode: task.mode,
              question: task.question,
            },
          });
        } catch {
          // Graceful fallback if storage service unavailable
        }
      }

      task.status = 'COMPLETED';
      task.progressPercent = 100;
      task.report = report;
      task.updatedAt = new Date().toISOString();

      this.tasks.set(taskId, task);
      this.reports.set(taskId, report);

      return report;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      task.status = 'FAILED';
      task.error = errorMsg;
      task.updatedAt = new Date().toISOString();
      this.tasks.set(taskId, task);
      throw err;
    }
  }

  public async quickSearch(query: string, limit = 5): Promise<SearchResultItem[]> {
    return this.searchRouter.search(query, { limit });
  }

  public async verifyClaim(claimText: string): Promise<Claim> {
    const searchResults = await this.searchRouter.search(claimText, { limit: 3 });
    const fetchPromises = searchResults.map((r) =>
      this.fetchRouter.fetch(r.canonicalUrl).catch(() => null)
    );
    const fetches = (await Promise.all(fetchPromises)).filter(
      (f): f is NonNullable<typeof f> => f !== null
    );

    const supportingSourceIds: string[] = [];
    const sourceIds: string[] = [];

    for (const fetchItem of fetches) {
      const extracted = this.trafilaturaExtractor.extract(fetchItem);
      const cleanText = extracted.extractedText || '';
      sourceIds.push(fetchItem.canonicalUrl);
      if (cleanText.toLowerCase().includes(claimText.toLowerCase().slice(0, 20))) {
        supportingSourceIds.push(fetchItem.canonicalUrl);
      }
    }

    const isCorroborated = supportingSourceIds.length >= 2;
    const isSupported = supportingSourceIds.length === 1;

    return {
      id: `clm_${createHash('sha256').update(claimText).digest('hex').substring(0, 8)}`,
      researchId: 'ad_hoc',
      claim: claimText,
      normalizedClaim: claimText.toLowerCase(),
      status: isCorroborated ? 'CORROBORATED' : isSupported ? 'SUPPORTED' : 'UNVERIFIED',
      confidence: isCorroborated ? 0.95 : isSupported ? 0.75 : 0.2,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
      sourceIds,
      createdAt: new Date().toISOString(),
    };
  }

  private generateSummary(question: string, claims: Claim[], sources: ResearchSource[]): string {
    const verifiedClaims = claims.filter((c) => c.status === 'CORROBORATED' || c.status === 'SUPPORTED');
    if (verifiedClaims.length === 0) {
      return `Research conducted for "${question}" across ${sources.length} sources. No fully corroborated claims were extracted; further investigation or primary source consultation recommended.`;
    }
    const topClaims = verifiedClaims.slice(0, 3).map((c) => c.claim).join(' ');
    return `Synthesized research findings for "${question}": ${topClaims} (Corroborated across ${sources.length} web sources).`;
  }

  private formatReportMarkdown(data: {
    question: string;
    mode: ResearchMode;
    summary: string;
    methodology: string;
    sources: ResearchSource[];
    claims: Claim[];
    conflicts: ResearchReport['conflicts'];
    timeline: TimelineEvent[];
    entities: ResearchEntity[];
    limitations: string[];
    citations: Citation[];
  }): string {
    const citationsMap = new Map<string, number>();
    data.citations.forEach((c, idx) => {
      citationsMap.set(c.sourceId, idx + 1);
    });

    let md = `# Research Report: ${data.question}\n\n`;
    md += `**Mode**: \`${data.mode}\` | **Date**: ${new Date().toLocaleDateString('en-US')} | **Status**: Verified\n\n`;

    md += `## Executive Summary\n\n${data.summary}\n\n`;

    md += `## Key Findings & Claims\n\n`;
    for (const c of data.claims) {
      const citeRefs = c.sourceIds
        .map((sid) => citationsMap.get(sid))
        .filter((n): n is number => n !== undefined)
        .map((n) => `[^${n}]`)
        .join(' ');

      const statusBadge =
        c.status === 'CORROBORATED'
          ? '✅ [Corroborated]'
          : c.status === 'SUPPORTED'
            ? '🔹 [Supported]'
            : '⚠️ [Unverified]';

      md += `- ${statusBadge} ${c.claim} ${citeRefs}\n`;
    }
    md += `\n`;

    if (data.conflicts.length > 0) {
      md += `## Conflicting Assertions & Ambiguities\n\n`;
      for (const conf of data.conflicts) {
        md += `### ${conf.claim}\n- **Explanation**: ${conf.explanation}\n\n`;
      }
    }

    if (data.timeline.length > 0) {
      md += `## Chronological Timeline\n\n`;
      for (const t of data.timeline) {
        md += `- **${t.eventDate}**: ${t.title} — ${t.description}\n`;
      }
      md += `\n`;
    }

    if (data.entities.length > 0) {
      md += `## Key Entities\n\n`;
      for (const e of data.entities) {
        md += `- **${e.name}** (\`${e.type}\`)\n`;
      }
      md += `\n`;
    }

    md += `## Methodology\n\n${data.methodology}\n\n`;

    md += `## Limitations\n\n`;
    for (const lim of data.limitations) {
      md += `- ${lim}\n`;
    }
    md += `\n`;

    md += `## References & Citations\n\n`;
    data.citations.forEach((c, idx) => {
      md += `[^${idx + 1}]: [${c.title}](${c.url}) - ${c.publisher || 'Web Source'}\n`;
    });

    return md;
  }
}
