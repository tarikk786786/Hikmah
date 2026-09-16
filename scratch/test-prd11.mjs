import assert from 'assert';
import fs from 'fs';
import { HttpSecurityGuard } from '../research/core/security/ssrf-guard.js';
import { UrlCanonicalizer } from '../research/core/canonicalizer.js';
import { QueryPlanner } from '../research/core/query-planner.js';
import { SearchRouter } from '../research/core/search-router.js';
import { FetchRouter } from '../research/core/fetch-router.js';
import { TrafilaturaExtractor } from '../research/core/extraction-router.js';
import { DiscoveryEngine } from '../research/core/discovery-engine.js';
import { SourceEvaluator, DuplicateStoryDetector, VerificationEngine } from '../research/core/verification-engine.js';
import { CitationEngine } from '../research/core/citation-engine.js';
import { TimelineEngine, EntityExtractor } from '../research/core/timeline-engine.js';
import { ResearchMonitorEngine } from '../research/core/monitor-engine.js';
import { ResearchOrchestrator } from '../research/core/orchestrator.js';
import { ResearchMCPServer } from '../mcp/servers/research/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

async function runAllTests() {
  const results = [];
  const logTest = (name, passed, err = null) => {
    results.push({ name, passed, error: err ? String(err?.message || err) : null });
    console.log(`${passed ? '✓' : '✗'} ${name}`);
    if (err) console.error(err);
  };

  console.log('\n=== RUNNING PRD 11 COMPREHENSIVE VERIFICATION SUITE ===\n');

  // Test 1: SSRF Guard
  try {
    let blockedCount = 0;
    try { HttpSecurityGuard.validateUrl('http://127.0.0.1:8080/admin'); } catch { blockedCount++; }
    try { HttpSecurityGuard.validateUrl('http://localhost:3000'); } catch { blockedCount++; }
    try { HttpSecurityGuard.validateUrl('http://192.168.1.1/setup'); } catch { blockedCount++; }
    try { HttpSecurityGuard.validateUrl('http://10.0.0.5/api'); } catch { blockedCount++; }
    try { HttpSecurityGuard.validateUrl('http://169.254.169.254/latest/meta-data'); } catch { blockedCount++; }
    assert.strictEqual(blockedCount, 5, 'All 5 SSRF attacks must be blocked');
    HttpSecurityGuard.validateUrl('https://en.wikipedia.org/wiki/WebAssembly');
    logTest('SSRF Guard (private blocks & cloud metadata)', true);
  } catch (err) {
    logTest('SSRF Guard (private blocks & cloud metadata)', false, err);
  }

  // Test 2: URL Canonicalizer
  try {
    const raw = 'HTTPS://WWW.Example.com:443/docs/api?utm_source=twitter&utm_medium=social&page=1#section-2';
    const canonical = UrlCanonicalizer.canonicalize(raw);
    assert.strictEqual(canonical, 'https://www.example.com/docs/api?page=1');
    assert.match(UrlCanonicalizer.hash(canonical), /^[a-f0-9]{64}$/);
    logTest('URL Canonicalizer (UTM stripping & SHA-256 hash)', true);
  } catch (err) {
    logTest('URL Canonicalizer (UTM stripping & SHA-256 hash)', false, err);
  }

  // Test 3: Query Planner
  try {
    const planner = new QueryPlanner();
    const quick = planner.plan('What is WebAssembly?', 'QUICK');
    assert.strictEqual(quick.length <= 2, true);
    const deep = planner.plan('Compare Postgres vs MySQL for high concurrency', 'DEEP');
    assert.strictEqual(deep.length >= 4, true);
    logTest('Query Planner (intent & mode adaptation)', true);
  } catch (err) {
    logTest('Query Planner (intent & mode adaptation)', false, err);
  }

  // Test 4: Search Router
  try {
    const router = new SearchRouter();
    const general = await router.search('TypeScript 5.8 features', { intent: 'GENERAL', limit: 3 });
    assert.strictEqual(general.length > 0, true);
    assert.strictEqual(Boolean(general[0].title), true);
    const academic = await router.search('Transformer attention mechanisms', { intent: 'ACADEMIC', limit: 2 });
    assert.strictEqual(academic.length > 0, true);
    const github = await router.search('vitest test runner', { intent: 'GITHUB', limit: 2 });
    assert.strictEqual(github.length > 0, true);
    logTest('Search Router (multi-intent SearXNG, Academic, GitHub)', true);
  } catch (err) {
    logTest('Search Router (multi-intent SearXNG, Academic, GitHub)', false, err);
  }

  // Test 5: Trafilatura Extractor
  try {
    const rawHtml = `
      <html>
        <head><title>Test Article</title><meta name="author" content="Dr. Turing"></head>
        <body>
          <nav><a href="/">Home</a><a href="/login">Login</a></nav>
          <div class="cookie">Accept cookies</div>
          <main><article><h1>The Imitation Game</h1><p>Can machines think? This inquiry spans algorithmic models, Turing machines, and deep neural structures.</p></article></main>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;
    const extractor = new TrafilaturaExtractor();
    const result = extractor.extract({
      url: 'https://example.com/test',
      canonicalUrl: 'https://example.com/test',
      status: 200,
      contentType: 'text/html',
      html: rawHtml,
      sizeBytes: rawHtml.length,
      retrievedAt: new Date().toISOString(),
      isStatic: true,
    });
    assert.strictEqual(result.author, 'Dr. Turing');
    assert.strictEqual(result.extractedText.includes('Can machines think?'), true);
    assert.strictEqual(result.extractedText.includes('Accept cookies'), false);
    logTest('Trafilatura Extractor (boilerplate, nav & script stripping)', true);
  } catch (err) {
    logTest('Trafilatura Extractor (boilerplate, nav & script stripping)', false, err);
  }

  // Test 6: Authority Evaluator & Wire Syndication Clustering
  try {
    assert.strictEqual(SourceEvaluator.evaluateAuthority('https://csrc.nist.gov'), 1);
    assert.strictEqual(SourceEvaluator.evaluateAuthority('https://mit.edu'), 2);
    assert.strictEqual(SourceEvaluator.evaluateAuthority('https://reuters.com'), 3);
    assert.strictEqual(SourceEvaluator.evaluateAuthority('https://techcrunch.com'), 5);
    assert.strictEqual(SourceEvaluator.evaluateAuthority('https://reddit.com'), 7);

    const detector = new DuplicateStoryDetector();
    const lead = 'WASHINGTON — The Federal Trade Commission announced sweeping new guidelines on AI watermarking.';
    const c1 = detector.registerStory('src_ap', 'FTC AI Rules', `${lead} Rules take effect soon.`);
    const c2 = detector.registerStory('src_regional', 'FTC AI Rules', `${lead} Local businesses responded.`);
    assert.strictEqual(c1.clusterId, c2.clusterId);
    assert.strictEqual(c1.isOriginalLead, true);
    assert.strictEqual(c2.isOriginalLead, false);
    logTest('Source Authority & Duplicate Wire-Service Clustering', true);
  } catch (err) {
    logTest('Source Authority & Duplicate Wire-Service Clustering', false, err);
  }

  // Test 7: Citation Engine (Anti-Hallucination)
  try {
    const citationEngine = new CitationEngine();
    const sources = [{
      id: 'src_rfc',
      url: 'https://rfc-editor.org/rfc/rfc9110',
      canonicalUrl: 'https://rfc-editor.org/rfc/rfc9110',
      urlHash: 'hash1',
      title: 'HTTP Semantics',
      sourceType: 'TECHNICAL',
      authority: 1,
      classification: 'PRIMARY',
      retrievedAt: new Date().toISOString(),
      contentHash: 'chash1',
    }];
    const citations = [
      { sourceId: 'src_rfc', url: 'https://rfc-editor.org/rfc/rfc9110', title: 'HTTP Semantics', verified: false },
      { sourceId: 'src_fake', url: 'https://fake.org/404', title: 'Fake', verified: false },
    ];
    const validated = citationEngine.validateCitations(citations, sources);
    assert.strictEqual(validated[0].verified, true);
    assert.strictEqual(validated[1].verified, false);
    logTest('Citation Engine (strict anti-hallucination grounding)', true);
  } catch (err) {
    logTest('Citation Engine (strict anti-hallucination grounding)', false, err);
  }

  // Test 8: Timeline & Entity Extractor
  try {
    const timelineEngine = new TimelineEngine();
    const entityExtractor = new EntityExtractor();
    const corpus = `
      In 1995, Brendan Eich developed JavaScript at Netscape.
      On 2008-09-02, Google launched Google Chrome.
      Linus Torvalds created Linux and Git.
    `;
    const timeline = timelineEngine.extractTimeline(corpus, ['src_1']);
    assert.strictEqual(timeline.length >= 2, true);
    const entities = entityExtractor.extractEntities(corpus, ['src_1']);
    assert.strictEqual(entities.length >= 2, true);
    assert.strictEqual(entities.some(e => e.name === 'Google' || e.name === 'Linux'), true);
    logTest('Timeline & Named Entity Graph Reconstruction', true);
  } catch (err) {
    logTest('Timeline & Named Entity Graph Reconstruction', false, err);
  }

  // Test 9: Research Monitor Engine
  try {
    const monitor = new ResearchMonitorEngine();
    const job = monitor.registerJob({
      id: 'mon_test_1',
      title: 'Release Tracker',
      targetUrls: ['https://en.wikipedia.org/wiki/PostgreSQL'],
      frequencyMinutes: 60,
      active: true,
      userId: 'usr_mon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const diffs1 = await monitor.checkMonitorJob('mon_test_1');
    assert.strictEqual(diffs1.length, 1);
    assert.strictEqual(diffs1[0].changeType, 'NEW');
    const diffs2 = await monitor.checkMonitorJob('mon_test_1');
    assert.strictEqual(diffs2.length, 1);
    assert.strictEqual(diffs2[0].changeType, 'UNCHANGED');
    logTest('Research Monitor Engine (change diffs: NEW, UNCHANGED)', true);
  } catch (err) {
    logTest('Research Monitor Engine (change diffs: NEW, UNCHANGED)', false, err);
  }

  // Test 10: Research MCPServer (14 Tools & Capabilities)
  try {
    const toolRegistry = ToolRegistry.getInstance();
    const capRegistry = CapabilityRegistry.getInstance();
    new ResearchMCPServer(undefined, undefined, toolRegistry, capRegistry);

    const tools = [
      'research_search', 'research_fetch', 'research_extract', 'research_discover',
      'research_start', 'research_get_status', 'research_get_report', 'research_verify_claim',
      'research_build_timeline', 'research_extract_entities', 'research_monitor_create',
      'research_monitor_check', 'research_monitor_list', 'research_validate_citations',
    ];

    for (const t of tools) {
      const toolDef = toolRegistry.getTool(t);
      assert.strictEqual(Boolean(toolDef), true, `Tool ${t} must be registered`);
      assert.strictEqual(toolDef.enabled, true);
    }

    const cap = capRegistry.get('cap_web_research_engine');
    assert.strictEqual(Boolean(cap), true);
    assert.strictEqual(cap.tools.length, 14);

    const searchRes = await toolRegistry.executeTool('research_search', { query: 'CRDT distributed systems', limit: 2 }, { requestId: 'r1', userId: 'u1' });
    assert.strictEqual(searchRes.success, true);
    logTest('Research MCP Server (all 14 tools & capabilities registered & executable)', true);
  } catch (err) {
    logTest('Research MCP Server (all 14 tools & capabilities registered & executable)', false, err);
  }

  // Test 11: End-to-End Orchestrator 11-Stage Pipeline
  try {
    const orchestrator = new ResearchOrchestrator();
    const task = await orchestrator.startResearch({
      question: 'Explain Conflict-Free Replicated Data Types (CRDTs)',
      mode: 'QUICK',
      userId: 'usr_tester_e2e',
    });
    assert.strictEqual(task.status, 'PENDING');

    const report = await orchestrator.executePipeline(task.id);
    assert.strictEqual(report.researchId, task.id);
    assert.strictEqual(Boolean(report.summary), true);
    assert.strictEqual(report.sources.length > 0, true);
    assert.strictEqual(report.markdown.includes('# Research Report'), true);
    assert.strictEqual(report.markdown.includes('Executive Summary'), true);
    assert.strictEqual(report.markdown.includes('Methodology'), true);

    const updatedTask = orchestrator.getTask(task.id);
    assert.strictEqual(updatedTask.status, 'COMPLETED');
    assert.strictEqual(updatedTask.progressPercent, 100);

    const claim = await orchestrator.verifyClaim('SQLite supports WAL mode');
    assert.strictEqual(Boolean(claim.status), true);
    logTest('Research Orchestrator (11-stage pipeline, report synthesis, claim verification)', true);
  } catch (err) {
    logTest('Research Orchestrator (11-stage pipeline, report synthesis, claim verification)', false, err);
  }

  const passedAll = results.every(r => r.passed);
  const summaryData = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    tests: results,
  };

  fs.writeFileSync('scratch/prd11-verification-report.json', JSON.stringify(summaryData, null, 2), 'utf-8');
  console.log(`\n=== PRD 11 VERIFICATION SUMMARY: ${summaryData.passed}/${summaryData.total} TESTS PASSED ===\n`);

  if (!passedAll) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
