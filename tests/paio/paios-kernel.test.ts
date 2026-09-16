import { describe, it, expect, beforeEach } from 'vitest';
import { PAIOSKernel } from '../../paio/kernel/paios-kernel';
import { PAIOSPolicyEngine } from '../../paio/policy/paios-policy-engine';
import { IntentEngine } from '../../paio/intent/intent-engine';
import { ProjectManager } from '../../paio/projects/project-manager';
import { SessionManager } from '../../paio/sessions/session-manager';
import { DeviceManager } from '../../paio/devices/device-manager';
import { ContextEngine } from '../../paio/context/context-engine';
import { SystemHealthEngine } from '../../paio/health/system-health-engine';
import { PAIOSMcpServer } from '../../paio/mcp/server';

describe('Step 25: Personal AI Operating System (PAIOS) Core Engine', () => {
  let kernel: PAIOSKernel;

  beforeEach(async () => {
    kernel = PAIOSKernel.getInstance();
    await kernel.boot();
  });

  it('1. should successfully boot and discover all 24 canonical subsystems', async () => {
    const status = kernel.getStatus();
    expect(status.isBooted).toBe(true);
    expect(status.version).toContain('1.0.0');
    expect(status.health.totalCount).toBeGreaterThanOrEqual(24);
    expect(status.health.healthyCount).toBe(status.health.totalCount);
    expect(status.activeProfile).toBeDefined();
    expect(status.currentDevice).toBeDefined();
  });

  it('2. should decompose natural language intent into structured objectives and subtasks', () => {
    const intentEngine = IntentEngine.getInstance();

    // Security pentest intent
    const secIntent = intentEngine.decompose('Run nmap safe enumeration and check for CVE vulnerabilities');
    expect(secIntent.category).toBe('security_pentest');
    expect(secIntent.riskLevel).toBe('high');
    expect(secIntent.suggestedAgents).toContain('security-pentester');
    expect(secIntent.subtasks.length).toBeGreaterThan(0);

    // Coding intent
    const codeIntent = intentEngine.decompose('Implement typescript interface and unit tests for session manager');
    expect(codeIntent.category).toBe('coding');
    expect(codeIntent.suggestedAgents).toContain('software-engineer');
    expect(codeIntent.requiredCapabilities).toContain('code-editor');

    // DevOps intent
    const devopsIntent = intentEngine.decompose('Deploy docker container to kubernetes cluster');
    expect(devopsIntent.category).toBe('devops');
    expect(devopsIntent.suggestedAgents).toContain('devops-engineer');
  });

  it('3. should assemble 7-layer context within token budget constraints', async () => {
    const contextEngine = ContextEngine.getInstance();
    const assembled = await contextEngine.assembleContext({
      userMessage: 'How do I optimize the database queries for my active project?',
      projectId: 'proj_hikmah_core',
      maxBudgetTokens: 64000,
    });

    expect(assembled.layers.length).toBe(7);
    expect(assembled.layers.map(l => l.name)).toEqual([
      'L0_CURRENT_INPUT',
      'L1_SESSION_HISTORY',
      'L2_PROJECT_CONTEXT',
      'L3_USER_PROFILE',
      'L4_MEMORY',
      'L5_CAPABILITIES',
      'L6_SYSTEM_POLICIES',
    ]);
    expect(assembled.promptContext).toContain('[CURRENT_USER_REQUEST]');
    expect(assembled.promptContext).toContain('[PAIOS_OPERATING_PRINCIPLES]');
    expect(assembled.totalTokensEstimate).toBeLessThanOrEqual(64000);
  });

  it('4. should enforce strict privacy modes (normal, private, offline, air-gapped)', () => {
    const policy = PAIOSPolicyEngine.getInstance();

    // In normal mode: cloud models allowed
    policy.setPrivacyMode('normal');
    let decision = policy.evaluate({
      action: 'Call Claude 3.7 Sonnet',
      category: 'model_call',
      provider: 'anthropic',
      isCloudProvider: true,
    });
    expect(decision.allowed).toBe(true);

    // In private mode: external cloud models blocked
    policy.setPrivacyMode('private');
    decision = policy.evaluate({
      action: 'Call Claude 3.7 Sonnet',
      category: 'model_call',
      provider: 'anthropic',
      isCloudProvider: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Private mode does not allow external cloud model providers');

    // In offline mode: all network egress blocked
    policy.setPrivacyMode('offline');
    decision = policy.evaluate({
      action: 'Fetch external API URL',
      category: 'network_egress',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Offline privacy mode strictly forbids network connections');

    // In air-gapped mode: strict zero egress
    policy.setPrivacyMode('air-gapped');
    decision = policy.evaluate({
      action: 'Send outgoing email via SMTP',
      category: 'email_send',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Air-gapped privacy mode permits zero network egress');

    // Reset back to normal
    policy.setPrivacyMode('normal');
  });

  it('5. should manage projects and generate continuity briefings', () => {
    const projectMgr = ProjectManager.getInstance();
    const proj = projectMgr.createProject({
      name: 'Mobile Client Migration',
      userId: 'user_master_owner',
      currentGoal: 'Refactor React Native auth flow to OAuth2 PKCE',
    });

    expect(proj.id).toBeDefined();
    expect(proj.name).toBe('Mobile Client Migration');

    projectMgr.recordActivity(proj.id, {
      type: 'task_update',
      description: 'Completed PKCE code challenge generation helper',
      actor: 'software-engineer',
    });

    const briefing = projectMgr.getContinuityBriefing(proj.id);
    expect(briefing.project.name).toBe('Mobile Client Migration');
    expect(briefing.recentActivities.length).toBe(1);
    expect(briefing.recommendedNextAction).toContain('Completed PKCE code challenge');
  });

  it('6. should checkpoint universal sessions and handoff to target device', () => {
    const sessionMgr = SessionManager.getInstance();
    const deviceMgr = DeviceManager.getInstance();

    const session = sessionMgr.createSession({
      userId: 'user_master_owner',
      profileId: 'prof_default_owner',
      title: 'DevOps Security Audit Session',
      deviceId: 'dev_primary_desktop',
    });

    expect(session.state).toBe('active');
    expect(session.currentDeviceId).toBe('dev_primary_desktop');

    // Handoff to mobile device
    const handoff = deviceMgr.handoffSession(session.id, 'dev_primary_mobile');
    expect(handoff.success).toBe(true);
    expect(handoff.sourceDeviceId).toBe('dev_primary_desktop');
    expect(handoff.targetDeviceId).toBe('dev_primary_mobile');
    expect(handoff.checkpointId).toBeDefined();

    // Verify session updated
    const updated = sessionMgr.getSession(session.id);
    expect(updated?.currentDeviceId).toBe('dev_primary_mobile');
    expect(updated?.checkpoints.length).toBeGreaterThanOrEqual(1);
  });

  it('7. should provide explainability decision records without chain-of-thought leakage', async () => {
    const result = await kernel.executeCommand('Research quantum computing advancements');
    expect(result.status).toBe('completed');
    expect(result.decision).toBeDefined();
    expect(result.decision.rationale).toBeDefined();
    expect(result.decision.rationale.ruleSummary).toBeDefined();
    expect(result.decision.rationale.privacyPolicyMatched).toBe('normal');

    // Query explanation via audit engine
    const explanation = kernel.audit.explain(result.decision.id);
    expect(explanation).toBeDefined();
    expect(explanation?.decision).toBe('completed');
  });

  it('8. should perform diagnostics and self-healing', async () => {
    const health = SystemHealthEngine.getInstance();
    const report = await health.runDiagnostics();
    expect(report.overallStatus).toBe('healthy');
    expect(report.healthyCount).toBe(report.totalCount);

    const healResult = health.triggerSelfHealing('subsys_model_router');
    expect(healResult.healed).toBe(true);
    expect(healResult.message).toContain('successfully self-healed');
  });

  it('9. should register and execute all Universal PAIOS MCP tools', async () => {
    const mcpServer = new PAIOSMcpServer();
    const tools = mcpServer.getTools();
    expect(tools.length).toBe(15);

    const statusTool = await mcpServer.callTool('system_status', {});
    expect(statusTool.isBooted).toBe(true);

    const decomposeTool = await mcpServer.callTool('intent_decompose', {
      prompt: 'Refactor database models for project',
    });
    expect(decomposeTool.category).toBe('coding');

    const devices = await mcpServer.callTool('device_list', {});
    expect(devices.length).toBeGreaterThanOrEqual(2);
  });
});
