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
import { AgentRegistry } from '../agents/agent-registry';
import { AgentFactory } from '../agents/agent-factory';
import { VaultEngine } from '../knowledge/core/vault-engine';
import { ModelRouter } from '../../core/model-router/router';
import { AdapterRegistry } from '../agents/providers/adapter-registry';
import { ObservabilityRegistry } from '../observability/providers/obs-registry';
import { EvaluationRegistry } from '../evaluation/providers/eval-registry';

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
  public readonly agents = AgentRegistry.getInstance();
  public readonly agentFactory = AgentFactory.getInstance();
  public readonly models = new ModelRouter();
  public readonly knowledge = new VaultEngine(process.cwd() + '/paio/knowledge/Vault');
  public readonly agentProviders = AdapterRegistry.getInstance();
  public readonly evaluation = EvaluationRegistry.getInstance();
  public readonly observability = ObservabilityRegistry.getInstance();

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

    // Initialize agent taxonomy
    this.seedAgentTaxonomy();

    // Initialize knowledge vault
    await this.knowledge.initialize();

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

  private seedAgentTaxonomy() {
    const taxonomy = [
      'Generalist Agent', 'Personal Assistant Agent', 'Supervisor Agent', 'Planner Agent', 'Router Agent',
      'Executor Agent', 'Research Agent', 'Deep Research Agent', 'Browser Agent', 'Computer-Use Agent',
      'Coding Agent', 'Code Review Agent', 'Debugging Agent', 'Testing Agent', 'DevOps Agent', 'SRE Agent',
      'Database Agent', 'SQL Agent', 'Data Analyst Agent', 'Data Scientist Agent', 'Math Agent',
      'Science Agent', 'Document Agent', 'Knowledge Agent', 'RAG Agent', 'Memory Agent',
      'Knowledge-Graph Agent', 'Writing Agent', 'Editor Agent', 'Translator Agent', 'Summarizer Agent',
      'Fact-Checking Agent', 'Search Agent', 'OSINT Agent', 'Vision Agent', 'OCR Agent', 'Image Agent',
      'Audio Agent', 'ASR Agent', 'TTS Agent', 'Video Agent', 'Multimodal Agent', 'Meeting Agent',
      'Calendar Agent', 'Email Agent', 'Communication Agent', 'Automation Agent', 'Workflow Agent',
      'Project Manager Agent', 'Task Manager Agent', 'Notification Agent', 'Monitoring Agent', 'Security Agent',
      'SOC Agent', 'Incident Agent', 'Privacy Agent', 'Compliance Agent', 'Simulation Agent',
      'Forecasting Agent', 'Optimization Agent', 'Critic Agent', 'Verifier Agent', 'Judge Agent',
      'Evaluator Agent', 'Red-Team Agent', 'Debate Agent', 'Ensemble Agent', 'Reflection Agent',
      'Recovery Agent', 'Memory-Consolidation Agent', 'Learning Agent', 'Skill-Builder Agent', 'Agent-Factory Agent'
    ];

    if (this.agents.listAgents().length === 0) {
      for (const type of taxonomy) {
        this.agentFactory.createAgent({
          name: `Core ${type}`,
          description: `Canonical Hikmah ${type}`,
          type: type,
        });
      }
    }
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
