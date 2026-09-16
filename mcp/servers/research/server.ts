import { ToolDefinition } from '../../../tools/registry/types.js';
import { ToolRegistry } from '../../../tools/registry/registry.js';
import { CapabilityRegistry } from '../../../core/capabilities/registry.js';
import { Capability } from '../../../core/capabilities/types.js';
import { ResearchOrchestrator } from '../../../research/core/orchestrator.js';
import { ResearchMonitorEngine } from '../../../research/core/monitor-engine.js';
import { SearchRouter } from '../../../research/core/search-router.js';
import { FetchRouter } from '../../../research/core/fetch-router.js';
import { TrafilaturaExtractor } from '../../../research/core/extraction-router.js';
import { DiscoveryEngine } from '../../../research/core/discovery-engine.js';
import { TimelineEngine, EntityExtractor } from '../../../research/core/timeline-engine.js';
import { CitationEngine } from '../../../research/core/citation-engine.js';
import { ResearchMode } from '../../../research/core/types.js';

export class ResearchMCPServer {
  private orchestrator: ResearchOrchestrator;
  private monitorEngine: ResearchMonitorEngine;
  private searchRouter: SearchRouter;
  private fetchRouter: FetchRouter;
  private extractor: TrafilaturaExtractor;
  private discoveryEngine: DiscoveryEngine;
  private timelineEngine: TimelineEngine;
  private entityExtractor: EntityExtractor;
  private citationEngine: CitationEngine;
  private toolRegistry: ToolRegistry;
  private capabilityRegistry: CapabilityRegistry;

  constructor(
    orchestrator?: ResearchOrchestrator,
    monitorEngine?: ResearchMonitorEngine,
    toolRegistry?: ToolRegistry,
    capabilityRegistry?: CapabilityRegistry
  ) {
    this.orchestrator = orchestrator || ResearchOrchestrator.getInstance();
    this.monitorEngine = monitorEngine || new ResearchMonitorEngine();
    this.searchRouter = new SearchRouter();
    this.fetchRouter = new FetchRouter();
    this.extractor = new TrafilaturaExtractor();
    this.discoveryEngine = new DiscoveryEngine(this.fetchRouter);
    this.timelineEngine = new TimelineEngine();
    this.entityExtractor = new EntityExtractor();
    this.citationEngine = new CitationEngine();
    this.toolRegistry = toolRegistry || ToolRegistry.getInstance();
    this.capabilityRegistry = capabilityRegistry || CapabilityRegistry.getInstance();

    this.registerAllTools();
  }

  private registerAllTools(): void {
    const tools: ToolDefinition[] = [
      // 1. research_search
      {
        name: 'research_search',
        version: '1.0.0',
        description: 'Execute multi-intent web searches across SearXNG, Academic, GitHub, and Historical archives',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term or question' },
            intent: {
              type: 'string',
              enum: ['GENERAL', 'NEWS', 'ACADEMIC', 'TECHNICAL', 'GOVERNMENT', 'COMMERCE', 'SOCIAL', 'GITHUB', 'HISTORICAL'],
            },
            limit: { type: 'number', description: 'Max results to return' },
          },
          required: ['query'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const results = await this.searchRouter.search(String(input.query), {
            intent: input.intent as any,
            limit: input.limit ? Number(input.limit) : 5,
          });
          return {
            success: true,
            data: { query: input.query, results, total: results.length },
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 2. research_fetch
      {
        name: 'research_fetch',
        version: '1.0.0',
        description: 'Fetch web page content with SSRF protection, format routing, and bot defenses',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to retrieve' },
          },
          required: ['url'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const result = await this.fetchRouter.fetch(String(input.url));
          return {
            success: true,
            data: result,
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 3. research_extract
      {
        name: 'research_extract',
        version: '1.0.0',
        description: 'Extract boilerplate-free main content, metadata, and tables from HTML using Trafilatura algorithms',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            html: { type: 'string', description: 'Raw HTML content' },
            url: { type: 'string', description: 'Source URL' },
          },
          required: ['html'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const extracted = this.extractor.extract({
            url: String(input.url || 'https://example.com'),
            canonicalUrl: String(input.url || 'https://example.com'),
            status: 200,
            contentType: 'text/html',
            html: String(input.html),
            sizeBytes: Buffer.byteLength(String(input.html)),
            retrievedAt: new Date().toISOString(),
            isStatic: true,
          });
          return {
            success: true,
            data: extracted,
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 4. research_discover
      {
        name: 'research_discover',
        version: '1.0.0',
        description: 'Discover relevant links and sub-pages from a root target URL',
        risk: 'LOW',
        timeoutMs: 15000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Root URL' },
            maxDepth: { type: 'number', description: 'Traversal depth (1-3)' },
          },
          required: ['url'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const links = await this.discoveryEngine.discover(
            String(input.url),
            input.maxDepth ? Number(input.maxDepth) : 1
          );
          return {
            success: true,
            data: { url: input.url, discoveredLinks: links, count: links.length },
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 5. research_start
      {
        name: 'research_start',
        version: '1.0.0',
        description: 'Start an autonomous deep research task with query planning, source aggregation, verification, and synthesis',
        risk: 'LOW',
        timeoutMs: 30000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'Research question or goal' },
            mode: { type: 'string', enum: ['QUICK', 'STANDARD', 'DEEP', 'INVESTIGATION', 'MONITOR'] },
            userId: { type: 'string' },
            projectId: { type: 'string' },
            runImmediately: { type: 'boolean', description: 'Whether to execute synchronously' },
          },
          required: ['question'],
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const start = Date.now();
          const task = await this.orchestrator.startResearch({
            question: String(input.question),
            mode: (input.mode as ResearchMode) || 'STANDARD',
            userId: String(input.userId || ctx?.userId || 'usr_default'),
            projectId: input.projectId ? String(input.projectId) : undefined,
          });

          if (input.runImmediately) {
            const report = await this.orchestrator.executePipeline(task.id);
            return {
              success: true,
              data: { task, report },
              executionTimeMs: Date.now() - start,
            };
          }

          return {
            success: true,
            data: { task },
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 6. research_get_status
      {
        name: 'research_get_status',
        version: '1.0.0',
        description: 'Check the status and progress of an ongoing research task',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Research Task ID' },
          },
          required: ['taskId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const task = this.orchestrator.getTask(String(input.taskId));
          if (!task) {
            return { success: false, error: `Task ${input.taskId} not found` };
          }
          return { success: true, data: task };
        },
      },

      // 7. research_get_report
      {
        name: 'research_get_report',
        version: '1.0.0',
        description: 'Get the synthesized research report including claims, evidence, timeline, and citations',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            researchId: { type: 'string', description: 'Research Task ID' },
          },
          required: ['researchId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const report = this.orchestrator.getReport(String(input.researchId));
          if (!report) {
            return { success: false, error: `Report for research ${input.researchId} not found` };
          }
          return { success: true, data: report };
        },
      },

      // 8. research_verify_claim
      {
        name: 'research_verify_claim',
        version: '1.0.0',
        description: 'Verify a specific factual claim against web search results and corroborating sources',
        risk: 'LOW',
        timeoutMs: 20000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            claim: { type: 'string', description: 'Factual claim text to verify' },
          },
          required: ['claim'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const claim = await this.orchestrator.verifyClaim(String(input.claim));
          return {
            success: true,
            data: claim,
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 9. research_build_timeline
      {
        name: 'research_build_timeline',
        version: '1.0.0',
        description: 'Extract chronological events and dates from text corpus or research sources',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Corpus containing dates and events' },
            sourceIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['text'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const timeline = this.timelineEngine.extractTimeline(
            String(input.text),
            (input.sourceIds as string[]) || []
          );
          return {
            success: true,
            data: { timeline, count: timeline.length },
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 10. research_extract_entities
      {
        name: 'research_extract_entities',
        version: '1.0.0',
        description: 'Identify named entities (persons, organizations, technologies, locations) with cross-source references',
        risk: 'LOW',
        timeoutMs: 10000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text corpus' },
            sourceIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['text'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const entities = this.entityExtractor.extractEntities(
            String(input.text),
            (input.sourceIds as string[]) || []
          );
          return {
            success: true,
            data: { entities, count: entities.length },
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 11. research_monitor_create
      {
        name: 'research_monitor_create',
        version: '1.0.0',
        description: 'Create a periodic monitoring job to track changes and new information across target URLs',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            targetUrls: { type: 'array', items: { type: 'string' } },
            frequencyMinutes: { type: 'number' },
            userId: { type: 'string' },
          },
          required: ['title', 'targetUrls'],
        },
        outputSchema: { type: 'object' },
        execute: async (input, ctx) => {
          const now = new Date().toISOString();
          const job = this.monitorEngine.registerJob({
            id: `mon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: String(input.title),
            targetUrls: input.targetUrls as string[],
            frequencyMinutes: input.frequencyMinutes ? Number(input.frequencyMinutes) : 60,
            active: true,
            userId: String(input.userId || ctx?.userId || 'usr_default'),
            createdAt: now,
            updatedAt: now,
          });
          return { success: true, data: job };
        },
      },

      // 12. research_monitor_check
      {
        name: 'research_monitor_check',
        version: '1.0.0',
        description: 'Execute an immediate change detection check for a registered monitor job',
        risk: 'LOW',
        timeoutMs: 20000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            monitorId: { type: 'string' },
          },
          required: ['monitorId'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const start = Date.now();
          const diffs = await this.monitorEngine.checkMonitorJob(String(input.monitorId));
          return {
            success: true,
            data: { monitorId: input.monitorId, diffs, total: diffs.length },
            executionTimeMs: Date.now() - start,
          };
        },
      },

      // 13. research_monitor_list
      {
        name: 'research_monitor_list',
        version: '1.0.0',
        description: 'List all registered research monitoring jobs',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const jobs = this.monitorEngine.listJobs(input.userId ? String(input.userId) : undefined);
          return { success: true, data: { jobs, total: jobs.length } };
        },
      },

      // 14. research_validate_citations
      {
        name: 'research_validate_citations',
        version: '1.0.0',
        description: 'Validate citations against retrieved sources enforcing the anti-hallucination rule',
        risk: 'LOW',
        timeoutMs: 5000,
        enabled: true,
        inputSchema: {
          type: 'object',
          properties: {
            citations: { type: 'array', items: { type: 'object' } },
            sources: { type: 'array', items: { type: 'object' } },
          },
          required: ['citations', 'sources'],
        },
        outputSchema: { type: 'object' },
        execute: async (input) => {
          const validated = this.citationEngine.validateCitations(
            input.citations as any,
            input.sources as any
          );
          return {
            success: true,
            data: { citations: validated, verifiedCount: validated.filter((c) => c.verified).length },
          };
        },
      },
    ];

    // Register each tool in ToolRegistry
    for (const tool of tools) {
      this.toolRegistry.register(tool);
    }

    // Register capabilities in CapabilityRegistry
    const capability: Capability = {
      id: 'cap_web_research_engine',
      name: 'Universal Web Research & Deep Research Engine',
      description: '11-stage autonomous research pipeline with anti-hallucination verification, multi-engine search, Trafilatura extraction, and live change monitoring',
      category: 'research',
      type: 'MCP_SERVER',
      provider: 'hikmah-research',
      version: '1.0.0',
      status: 'AVAILABLE',
      health: 'HEALTHY',
      tools: tools.map((t) => t.name),
      features: [
        '11-stage research pipeline',
        'SearXNG multi-engine search',
        'Academic, GitHub & Historical archives',
        'Trafilatura boilerplate extraction',
        'Wire-service duplicate story detection',
        'Strict anti-hallucination citation validation',
        'Timeline & entity graph extraction',
        'Scheduled web change monitoring',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.capabilityRegistry.register(capability);
  }
}
