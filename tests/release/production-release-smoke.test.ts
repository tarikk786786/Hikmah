import { describe, it, expect, beforeAll } from 'vitest';
import { PAIOSKernel } from '../../paio/kernel/paios-kernel';
import { PAIOSPolicyEngine } from '../../paio/policy/paios-policy-engine';
import { IntentEngine } from '../../paio/intent/intent-engine';
import { ContextEngine } from '../../paio/context/context-engine';
import { ProjectManager } from '../../paio/projects/project-manager';
import { SessionManager } from '../../paio/sessions/session-manager';
import { DeviceManager } from '../../paio/devices/device-manager';
import { SystemHealthEngine } from '../../paio/health/system-health-engine';
import { PAIOSMcpServer } from '../../paio/mcp/server';

describe('HIKMAH Production Release Smoke & Integrity Gate', () => {
  let kernel: PAIOSKernel;

  beforeAll(async () => {
    kernel = PAIOSKernel.getInstance();
    await kernel.boot();
  });

  it('Gate 1: Boot & Subsystems Discovery — All canonical subsystems operational', () => {
    const status = kernel.getStatus();
    expect(status.isBooted).toBe(true);
    expect(status.version).toBeDefined();
    expect(status.health.totalCount).toBeGreaterThanOrEqual(24);
    expect(status.health.healthyCount).toBe(status.health.totalCount);
    expect(status.health.overallStatus).toBe('healthy');
  });

  it('Gate 2: Privacy Policy & Egress Guardrails — Strict mode enforcement', () => {
    const policy = PAIOSPolicyEngine.getInstance();

    // 1. Normal Mode: cloud calls allowed
    policy.setPrivacyMode('normal');
    expect(policy.getPrivacyMode()).toBe('normal');
    let res = policy.evaluate({
      action: 'Call Anthropic Claude API',
      category: 'model_call',
      provider: 'anthropic',
      isCloudProvider: true,
    });
    expect(res.allowed).toBe(true);

    // 2. Private Mode: cloud models blocked
    policy.setPrivacyMode('private');
    expect(policy.getPrivacyMode()).toBe('private');
    res = policy.evaluate({
      action: 'Call Anthropic Claude API',
      category: 'model_call',
      provider: 'anthropic',
      isCloudProvider: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Private mode does not allow external cloud model providers');

    // 3. Offline Mode: network egress blocked
    policy.setPrivacyMode('offline');
    res = policy.evaluate({
      action: 'Query SearXNG Web API',
      category: 'network_egress',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Offline privacy mode strictly forbids network connections');

    // 4. Air-Gapped Mode: zero egress strict
    policy.setPrivacyMode('air-gapped');
    res = policy.evaluate({
      action: 'Send outgoing SMTP message',
      category: 'email_send',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('Air-gapped privacy mode permits zero network egress');

    // Restore to normal
    policy.setPrivacyMode('normal');
  });

  it('Gate 3: Natural Language Intent Decomposition & Capability Plan', () => {
    const intent = IntentEngine.getInstance();
    const result = intent.decompose('Audit staging cluster security and generate remediation tasks');
    expect(result.category).toBe('security_pentest');
    expect(result.riskLevel).toBe('high');
    expect(result.suggestedAgents).toContain('security-pentester');
    expect(result.subtasks.length).toBeGreaterThan(0);
  });

  it('Gate 4: 7-Layer Context Engine Assembly & Token Budgeting', async () => {
    const contextEngine = ContextEngine.getInstance();
    const ctx = await contextEngine.assembleContext({
      userMessage: 'Verify production release readiness for Step 25',
      maxBudgetTokens: 128000,
    });

    expect(ctx.layers.length).toBe(7);
    expect(ctx.promptContext).toContain('[CURRENT_USER_REQUEST]');
    expect(ctx.promptContext).toContain('[PAIOS_OPERATING_PRINCIPLES]');
    expect(ctx.totalTokensEstimate).toBeLessThanOrEqual(128000);
  });

  it('Gate 5: Project Workspaces & Continuity Briefing', () => {
    const projectMgr = ProjectManager.getInstance();
    const active = projectMgr.getActiveProject();
    expect(active).toBeDefined();

    const briefing = projectMgr.getContinuityBriefing(active!.id);
    expect(briefing.project.id).toBe(active!.id);
    expect(briefing.pendingSummary).toBeDefined();
    expect(briefing.recommendedNextAction).toBeDefined();
  });

  it('Gate 6: Persistent Sessions & Cross-Device Handoff', () => {
    const sessionMgr = SessionManager.getInstance();
    const deviceMgr = DeviceManager.getInstance();

    const session = sessionMgr.createSession({
      userId: 'user_master_owner',
      profileId: 'prof_default_owner',
      title: 'Production Verification Run',
      deviceId: 'dev_primary_desktop',
    });

    const handoff = deviceMgr.handoffSession(session.id, 'dev_primary_mobile');
    expect(handoff.success).toBe(true);
    expect(handoff.targetDeviceId).toBe('dev_primary_mobile');

    const verifiedSession = sessionMgr.getSession(session.id);
    expect(verifiedSession?.currentDeviceId).toBe('dev_primary_mobile');
    expect(verifiedSession?.checkpoints.length).toBeGreaterThan(0);
  });

  it('Gate 7: Explainability Decision Records — No Chain-of-Thought Leakage', async () => {
    const execution = await kernel.executeCommand('Run system security scan');
    expect(execution.decision).toBeDefined();
    expect(execution.decision.rationale).toBeDefined();
    expect(execution.decision.rationale.ruleSummary).toBeDefined();
    // Verify no raw internal thinking field exists in decision record
    expect((execution.decision as any).thinking).toBeUndefined();

    const explanation = kernel.audit.explain(execution.decision.id);
    expect(explanation).toBeDefined();
    expect(explanation?.id).toBe(execution.decision.id);
  });

  it('Gate 8: Self-Healing & Diagnostics Engine', async () => {
    const health = SystemHealthEngine.getInstance();
    const diag = await health.runDiagnostics();
    expect(diag.overallStatus).toBe('healthy');

    const healed = health.triggerSelfHealing('subsys_model_router');
    expect(healed.healed).toBe(true);
  });

  it('Gate 9: Universal PAIOS MCP Gateway Tools', async () => {
    const mcp = new PAIOSMcpServer();
    const tools = mcp.getTools();
    expect(tools.length).toBe(15);

    const statusRes = await mcp.callTool('system_status', {});
    expect(statusRes.isBooted).toBe(true);

    const briefing = await mcp.callTool('project_get_briefing', { projectId: 'proj_hikmah_core' });
    expect(briefing.project).toBeDefined();
  });
});
