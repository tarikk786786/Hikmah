import { AISystemBus, PAIOSSystemEvent } from '../events/ai-system-bus';
import { IdentityManager } from '../identity/identity-manager';
import { PAIOSPolicyEngine, PrivacyMode } from '../policy/paios-policy-engine';
import { ContextEngine, AssembledContext } from '../context/context-engine';
import { IntentEngine, DecomposedIntent } from '../intent/intent-engine';
import { ProjectManager, PAIOSProject } from '../projects/project-manager';
import { SessionManager, PAIOSSession } from '../sessions/session-manager';
import { DeviceManager, PAIOSDevice } from '../devices/device-manager';
import { AIFileSystem } from '../files/ai-file-system';
import { TaskManager } from '../tasks/task-manager';
import { NotificationCenter } from '../notifications/notification-center';
import { SystemHealthEngine, SystemHealthReport } from '../health/system-health-engine';
import { PAIOSAuditEngine, PAIOSDecisionRecord } from '../audit/paios-audit-engine';

export interface KernelBootStatus {
  isBooted: boolean;
  version: string;
  uptimeSeconds: number;
  bootedAt: string;
  activeProfile: string;
  currentDevice: string;
  privacyMode: PrivacyMode;
  health: SystemHealthReport;
}

export interface CommandExecutionResult {
  intent: DecomposedIntent;
  decision: PAIOSDecisionRecord;
  context: AssembledContext;
  status: 'completed' | 'blocked' | 'requires_approval';
  output: string;
  approvalId?: string;
  sessionId: string;
  projectId?: string;
  executedAt: string;
}

export class PAIOSKernel {
  private static instance: PAIOSKernel;
  private isBooted = false;
  private bootedAt: string | null = null;
  private bootTimeEpoch: number = 0;
  private version = '1.0.0-paios.step25';

  // Subsystem instances
  public readonly bus = AISystemBus.getInstance();
  public readonly identity = IdentityManager.getInstance();
  public readonly policy = PAIOSPolicyEngine.getInstance();
  public readonly context = ContextEngine.getInstance();
  public readonly intent = IntentEngine.getInstance();
  public readonly projects = ProjectManager.getInstance();
  public readonly sessions = SessionManager.getInstance();
  public readonly devices = DeviceManager.getInstance();
  public readonly files = AIFileSystem.getInstance();
  public readonly tasks = TaskManager.getInstance();
  public readonly notifications = NotificationCenter.getInstance();
  public readonly health = SystemHealthEngine.getInstance();
  public readonly audit = PAIOSAuditEngine.getInstance();

  private constructor() {}

  public static getInstance(): PAIOSKernel {
    if (!PAIOSKernel.instance) {
      PAIOSKernel.instance = new PAIOSKernel();
    }
    return PAIOSKernel.instance;
  }

  public async boot(): Promise<KernelBootStatus> {
    if (this.isBooted) {
      return this.getStatus();
    }

    this.bootedAt = new Date().toISOString();
    this.bootTimeEpoch = Date.now();

    // Verify system health
    const healthReport = await this.health.runDiagnostics();

    // Ensure active profile and device are synchronized
    const profile = this.identity.getActiveProfile();
    if (profile.preferences?.privacyMode) {
      this.policy.setPrivacyMode(profile.preferences.privacyMode, 'Synced from active user profile on boot');
    }

    this.isBooted = true;

    this.bus.emit({
      type: 'kernel.booted',
      source: 'PAIOSKernel',
      userId: profile.userId,
      data: {
        version: this.version,
        privacyMode: this.policy.getPrivacyMode(),
        healthySubsystems: healthReport.healthyCount,
        totalSubsystems: healthReport.totalCount,
      },
    });

    return this.getStatus();
  }

  public getStatus(): KernelBootStatus {
    const profile = this.identity.getActiveProfile();
    const device = this.devices.getCurrentDevice();
    const uptimeSeconds = this.isBooted ? Math.floor((Date.now() - this.bootTimeEpoch) / 1000) : 0;

    return {
      isBooted: this.isBooted,
      version: this.version,
      uptimeSeconds,
      bootedAt: this.bootedAt || new Date().toISOString(),
      activeProfile: profile.name,
      currentDevice: `${device.name} (${device.platform})`,
      privacyMode: this.policy.getPrivacyMode(),
      health: this.health.getReport(),
    };
  }

  public async executeCommand(command: string, options?: {
    sessionId?: string;
    projectId?: string;
    targetDeviceId?: string;
  }): Promise<CommandExecutionResult> {
    if (!this.isBooted) {
      await this.boot();
    }

    const session = options?.sessionId
      ? this.sessions.getSession(options.sessionId) || this.sessions.getActiveSession()!
      : this.sessions.getActiveSession()!;

    const activeProject = options?.projectId
      ? this.projects.getProject(options.projectId) || this.projects.getActiveProject()
      : this.projects.getActiveProject();

    // 1. Decompose Intent
    const intentResult = this.intent.decompose(command, {
      currentProjectId: activeProject?.id,
    });

    // 2. Evaluate Policy
    const policyDecision = this.policy.evaluate({
      action: intentResult.primaryObjective,
      category: intentResult.riskLevel === 'high' ? 'command_exec' : 'general',
      metadata: { highRisk: intentResult.riskLevel === 'high' },
    });

    // 3. Assemble 7-Layer Context
    const assembledContext = await this.context.assembleContext({
      userMessage: command,
      sessionId: session.id,
      projectId: activeProject?.id,
      profileId: session.profileId,
    });

    // 4. Record Decision
    let approvalId: string | undefined;
    let status: CommandExecutionResult['status'] = 'completed';
    let outputText = '';

    if (!policyDecision.allowed) {
      status = 'blocked';
      outputText = `Command blocked by privacy policy: ${policyDecision.reason}`;
    } else if (policyDecision.requiresUserApproval) {
      status = 'requires_approval';
      approvalId = this.policy.createApprovalRequest(
        {
          action: intentResult.primaryObjective,
          category: 'command_exec',
          metadata: { highRisk: true },
        },
        policyDecision.approvalPrompt || 'Explicit approval required'
      );
      outputText = `Action '${intentResult.primaryObjective}' requires user approval (Approval ID: ${approvalId}).`;
    } else {
      outputText = `Command processed successfully for category '${intentResult.category}'. Assigned agent: ${intentResult.suggestedAgents.join(', ') || 'system-kernel'}.`;
      
      // If subtasks generated, automatically register them in TaskManager
      if (intentResult.subtasks.length > 0 && activeProject) {
        for (const sub of intentResult.subtasks) {
          this.tasks.createTask({
            projectId: activeProject.id,
            title: sub.description,
            priority: intentResult.urgency === 'critical' ? 'urgent' : 'medium',
            assignedAgentId: sub.suggestedAgent,
          });
        }
      }

      // Checkpoint the session with latest progress
      this.sessions.checkpointSession(session.id, {
        summary: `Executed: "${command.slice(0, 60)}"`,
        stepIndex: session.checkpoints.length + 1,
      });
    }

    const decisionRecord = this.audit.logDecision({
      traceId: `tr_${Date.now()}`,
      sessionId: session.id,
      projectId: activeProject?.id,
      action: `executeCommand: ${command.slice(0, 60)}`,
      decision: status,
      rationale: {
        ruleSummary: policyDecision.reason,
        privacyPolicyMatched: policyDecision.privacyMode,
        hardwareCompatible: true,
        providerHealthy: true,
        userDefaultApplied: true,
      },
      details: {
        category: intentResult.category,
        urgency: intentResult.urgency,
        riskLevel: intentResult.riskLevel,
        suggestedAgents: intentResult.suggestedAgents,
      },
    });

    return {
      intent: intentResult,
      decision: decisionRecord,
      context: assembledContext,
      status,
      output: outputText,
      approvalId,
      sessionId: session.id,
      projectId: activeProject?.id,
      executedAt: new Date().toISOString(),
    };
  }
}
