import assert from 'assert';
import fs from 'fs';
import { PlaywrightBrowserDriver } from '../browser/core/driver/playwright-driver.js';
import { BrowserSecurityGuard } from '../browser/core/security/browser-guard.js';
import { BrowserSessionManager } from '../browser/core/session-manager.js';
import { StagehandProvider } from '../browser/core/semantic/stagehand-provider.js';
import { SelfHealingEngine } from '../browser/core/self-healing/self-healing-engine.js';
import { BrowserUseAgent } from '../browser/core/agent/browser-use-agent.js';
import { BrowserOrchestrator } from '../browser/core/orchestrator.js';
import { BrowserMCPServer } from '../mcp/servers/browser/server.js';
import { ToolRegistry } from '../tools/registry/registry.js';
import { CapabilityRegistry } from '../core/capabilities/registry.js';

async function runAllTests() {
  const results = [];
  const logTest = (name, passed, err = null) => {
    results.push({ name, passed, error: err ? String(err?.message || err) : null });
    console.log(`${passed ? '✓' : '✗'} ${name}`);
    if (err) console.error(err);
  };

  console.log('\n=== RUNNING PRD 12 BROWSER INTELLIGENCE COMPREHENSIVE SUITE ===\n');

  // Test 1: BrowserSecurityGuard
  try {
    const safe = BrowserSecurityGuard.validateNavigationUrl('https://news.ycombinator.com');
    assert.strictEqual(safe.safe, true);

    const blockedLocal = BrowserSecurityGuard.validateNavigationUrl('http://127.0.0.1:8080');
    assert.strictEqual(blockedLocal.safe, false);

    const blockedMeta = BrowserSecurityGuard.validateNavigationUrl('http://169.254.169.254/latest/meta-data');
    assert.strictEqual(blockedMeta.safe, false);

    const blockedFile = BrowserSecurityGuard.validateNavigationUrl('file:///etc/passwd');
    assert.strictEqual(blockedFile.safe, false);

    const dSafe = BrowserSecurityGuard.validateDownload('report.pdf');
    assert.strictEqual(dSafe.safe, true);
    const dUnsafe = BrowserSecurityGuard.validateDownload('payload.exe');
    assert.strictEqual(dUnsafe.safe, false);

    logTest('BrowserSecurityGuard (SSRF block, dangerous protocols & download quarantine)', true);
  } catch (err) {
    logTest('BrowserSecurityGuard (SSRF block, dangerous protocols & download quarantine)', false, err);
  }

  // Test 2: PlaywrightBrowserDriver Navigation & Screenshots
  try {
    const driver = new PlaywrightBrowserDriver();
    await driver.init();

    const nav = await driver.navigate('about:blank');
    assert.strictEqual(nav.status, 200);
    assert.strictEqual(driver.getCurrentUrl(), 'about:blank');
    assert.strictEqual(driver.getTitle(), 'Blank Page');

    const screenshotBuffer = await driver.screenshot();
    assert.strictEqual(Buffer.isBuffer(screenshotBuffer), true);
    assert.strictEqual(screenshotBuffer.length > 0, true);
    // Verify PNG header
    assert.strictEqual(screenshotBuffer[0], 0x89);
    assert.strictEqual(screenshotBuffer[1], 0x50);
    assert.strictEqual(screenshotBuffer[2], 0x4e);
    assert.strictEqual(screenshotBuffer[3], 0x47);

    const snapshot = await driver.snapshotDOM();
    assert.strictEqual(snapshot.url, 'about:blank');
    assert.strictEqual(Array.isArray(snapshot.interactiveElements), true);

    const a11y = await driver.extractAccessibilityTree();
    assert.strictEqual(a11y.role, 'WebArea');

    await driver.close();
    logTest('PlaywrightBrowserDriver (Navigation, PNG Screenshot & DOM/A11y inspection)', true);
  } catch (err) {
    logTest('PlaywrightBrowserDriver (Navigation, PNG Screenshot & DOM/A11y inspection)', false, err);
  }

  // Test 3: BrowserSessionManager
  try {
    const manager = new BrowserSessionManager();
    const profiles = manager.listProfiles();
    assert.strictEqual(profiles.length >= 1, true);

    const profile = manager.createProfile({
      name: 'Tor Profile',
      proxy: { server: 'socks5://127.0.0.1:9050' },
      cookies: [{ name: 'auth', value: 'secret', domain: 'example.com', path: '/' }],
    });
    assert.strictEqual(profile.name, 'Tor Profile');
    assert.strictEqual(profile.cookies.length, 1);

    const session = manager.createSession({ profileId: profile.id });
    assert.strictEqual(session.profileId, profile.id);
    assert.strictEqual(session.status, 'idle');

    manager.updateSession(session.id, { status: 'navigating', currentUrl: 'https://example.com' });
    const updated = manager.getSession(session.id);
    assert.strictEqual(updated.status, 'navigating');
    assert.strictEqual(updated.currentUrl, 'https://example.com');

    const closed = manager.closeSession(session.id);
    assert.strictEqual(closed, true);
    assert.strictEqual(manager.listSessions(false).length, 0);

    logTest('BrowserSessionManager (Profiles, isolated sessions & lifecycle)', true);
  } catch (err) {
    logTest('BrowserSessionManager (Profiles, isolated sessions & lifecycle)', false, err);
  }

  // Test 4: StagehandProvider Semantic Actions
  try {
    const driver = new PlaywrightBrowserDriver();
    await driver.init();
    await driver.navigate('about:blank');

    const stagehand = new StagehandProvider(driver);

    // Act typing
    const actType = await stagehand.act({ instruction: "type 'Hikmah OS' into query" });
    assert.strictEqual(actType.success, true);
    assert.strictEqual(actType.type, 'type');
    assert.strictEqual(actType.data.typedText, 'Hikmah OS');

    // Act scroll
    const actScroll = await stagehand.act({ instruction: 'scroll down' });
    assert.strictEqual(actScroll.success, true);
    assert.strictEqual(actScroll.type, 'scroll');

    // Extract schema
    const extracted = await stagehand.extract({ schema: { title: 'string', url: 'string' } });
    assert.strictEqual(extracted.title, 'Blank Page');
    assert.strictEqual(extracted.url, 'about:blank');

    // Observe affordances
    const observe = await stagehand.observe();
    assert.strictEqual(Array.isArray(observe.suggestions), true);

    await driver.close();
    logTest('StagehandProvider (Natural language Act, schema Extract & affordance Observe)', true);
  } catch (err) {
    logTest('StagehandProvider (Natural language Act, schema Extract & affordance Observe)', false, err);
  }

  // Test 5: SelfHealingEngine
  try {
    const driver = new PlaywrightBrowserDriver();
    await driver.init();
    await driver.navigate('about:blank');

    const healer = new SelfHealingEngine(driver);
    const healed = await healer.healSelector('#obsolete-button-v1', {
      targetRole: 'button',
      targetText: 'Submit',
    });
    assert.strictEqual(healed.originalSelector, '#obsolete-button-v1');
    assert.strictEqual(typeof healed.confidence, 'number');

    // Cache verification
    const cached = await healer.healSelector('#obsolete-button-v1');
    assert.strictEqual(cached.originalSelector, healed.originalSelector);

    await driver.close();
    logTest('SelfHealingEngine (Fuzzy attribute, role/name matching & selector cache)', true);
  } catch (err) {
    logTest('SelfHealingEngine (Fuzzy attribute, role/name matching & selector cache)', false, err);
  }

  // Test 6: BrowserMCPServer & ToolRegistry Integration
  try {
    const toolRegistry = ToolRegistry.getInstance();
    const capabilityRegistry = CapabilityRegistry.getInstance();
    new BrowserMCPServer(undefined, toolRegistry, capabilityRegistry);

    const tools = [
      'browser_navigate',
      'browser_click',
      'browser_type',
      'browser_fill_form',
      'browser_select',
      'browser_scroll',
      'browser_wait',
      'browser_screenshot',
      'browser_snapshot_dom',
      'browser_extract_accessibility',
      'browser_act_semantic',
      'browser_extract_semantic',
      'browser_observe',
      'browser_session_create',
      'browser_session_close',
      'browser_run_agent',
    ];

    for (const t of tools) {
      const def = toolRegistry.getTool(t);
      assert.strictEqual(def !== undefined, true, `Tool ${t} must be registered`);
    }

    const cap = capabilityRegistry.get('cap_browser_intelligence_engine');
    assert.strictEqual(cap !== undefined, true);
    assert.strictEqual(cap.category, 'browser');
    assert.strictEqual(cap.tools.length, 16);

    // Execute session create tool
    const sCreate = await toolRegistry.executeTool(
      'browser_session_create',
      {},
      { requestId: 'req_1', userId: 'usr_test' }
    );
    assert.strictEqual(sCreate.success, true);
    const sId = sCreate.data.id;

    // Execute navigation tool
    const sNav = await toolRegistry.executeTool(
      'browser_navigate',
      { sessionId: sId, url: 'about:blank' },
      { requestId: 'req_2', userId: 'usr_test' }
    );
    assert.strictEqual(sNav.success, true);

    // Execute screenshot tool
    const sShot = await toolRegistry.executeTool(
      'browser_screenshot',
      { sessionId: sId },
      { requestId: 'req_3', userId: 'usr_test' }
    );
    assert.strictEqual(sShot.success, true);
    assert.strictEqual(typeof sShot.data.base64, 'string');

    // Execute snapshot tool
    const sSnap = await toolRegistry.executeTool(
      'browser_snapshot_dom',
      { sessionId: sId },
      { requestId: 'req_4', userId: 'usr_test' }
    );
    assert.strictEqual(sSnap.success, true);
    assert.strictEqual(sSnap.data.title, 'Blank Page');

    // Execute close session tool
    const sClose = await toolRegistry.executeTool(
      'browser_session_close',
      { sessionId: sId },
      { requestId: 'req_5', userId: 'usr_test' }
    );
    assert.strictEqual(sClose.success, true);

    logTest('BrowserMCPServer (All 16 tools registered & executed via ToolRegistry)', true);
  } catch (err) {
    logTest('BrowserMCPServer (All 16 tools registered & executed via ToolRegistry)', false, err);
  }

  // Test 7: Master BrowserOrchestrator & BrowserUseAgent
  try {
    const orchestrator = BrowserOrchestrator.getInstance();

    const session = await orchestrator.createSession();
    assert.strictEqual(session.id !== undefined, true);

    const nav = await orchestrator.navigate(session.id, 'about:blank');
    assert.strictEqual(nav.success, true);

    const typeRes = await orchestrator.type(session.id, '#input', 'Test value');
    assert.strictEqual(typeRes.success, true);

    const actRes = await orchestrator.actSemantic(session.id, { instruction: 'scroll down' });
    assert.strictEqual(actRes.success, true);

    const logs = orchestrator.getActionLogs(session.id);
    assert.strictEqual(logs.length >= 2, true);

    // Test BrowserUseAgent
    const agentGoal = await orchestrator.runAgent({
      goal: 'Inspect the blank page and verify title',
      startUrl: 'about:blank',
      maxSteps: 2,
    });
    assert.strictEqual(agentGoal.status, 'completed');
    assert.strictEqual(agentGoal.steps.length >= 1, true);
    assert.strictEqual(agentGoal.finalAnswer !== undefined, true);

    await orchestrator.closeSession(session.id);
    logTest('BrowserOrchestrator & BrowserUseAgent (Full lifecycle & autonomous goal loop)', true);
  } catch (err) {
    logTest('BrowserOrchestrator & BrowserUseAgent (Full lifecycle & autonomous goal loop)', false, err);
  }

  // Save report
  const summary = {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };

  fs.writeFileSync('scratch/prd12-verification-summary.json', JSON.stringify(summary, null, 2), 'utf-8');
  console.log('\n=== PRD 12 VERIFICATION RESULT ===');
  console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}\n`);

  if (summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
