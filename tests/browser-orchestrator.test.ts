import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserOrchestrator } from '../browser/core/orchestrator.js';

describe('PRD 12: Master Browser Orchestrator', () => {
  let orchestrator: BrowserOrchestrator;

  beforeEach(() => {
    orchestrator = BrowserOrchestrator.getInstance();
  });

  it('should manage full browser session lifecycle', async () => {
    const session = await orchestrator.createSession();
    expect(session.id).toBeDefined();
    expect(session.status).toBe('idle');

    const nav = await orchestrator.navigate(session.id, 'about:blank');
    expect(nav.success).toBe(true);

    const s = orchestrator.getSession(session.id);
    expect(s?.currentUrl).toBe('about:blank');

    const closed = await orchestrator.closeSession(session.id);
    expect(closed).toBe(true);
  });

  it('should execute interactions and record audit logs', async () => {
    const session = await orchestrator.createSession();
    await orchestrator.navigate(session.id, 'about:blank');

    const typeRes = await orchestrator.type(session.id, '#input-box', 'Hikmah Test');
    expect(typeRes.success).toBe(true);

    const waitRes = await orchestrator.waitFor(session.id, 50);
    expect(waitRes.success).toBe(true);

    const logs = orchestrator.getActionLogs(session.id);
    expect(logs.length).toBeGreaterThan(0);

    await orchestrator.closeSession(session.id);
  });

  it('should coordinate Stagehand semantic operations', async () => {
    const session = await orchestrator.createSession();
    await orchestrator.navigate(session.id, 'about:blank');

    const actRes = await orchestrator.actSemantic(session.id, {
      instruction: "type 'hello world' into message input",
    });
    expect(actRes.success).toBe(true);

    const extractRes = await orchestrator.extractSemantic(session.id, {
      schema: { title: 'title' },
    });
    expect(extractRes).toBeDefined();
    expect(extractRes.title).toBe('Blank Page');

    const observeRes = await orchestrator.observe(session.id);
    expect(observeRes).toBeDefined();
    expect(observeRes.suggestions).toBeDefined();

    await orchestrator.closeSession(session.id);
  });

  it('should run autonomous multi-step BrowserUseAgent goals', async () => {
    const goalResult = await orchestrator.runAgent({
      goal: 'Inspect the blank page and report page title',
      startUrl: 'about:blank',
      maxSteps: 3,
    });

    expect(goalResult).toBeDefined();
    expect(goalResult.status).toBe('completed');
    expect(goalResult.steps.length).toBeGreaterThan(0);
    expect(goalResult.finalAnswer).toBeDefined();
  });
});
