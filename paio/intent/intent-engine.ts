import { AISystemBus } from '../events/ai-system-bus';
import { PAIOSPolicyEngine } from '../policy/paios-policy-engine';

export type IntentCategory =
  | 'coding'
  | 'devops'
  | 'research'
  | 'browser'
  | 'security_pentest'
  | 'security_soc'
  | 'email_calendar'
  | 'workflow'
  | 'project_management'
  | 'system_control'
  | 'conversational';

export interface DecomposedTask {
  step: number;
  description: string;
  suggestedAgent: string;
  requiredCapabilities: string[];
  isHighRisk: boolean;
}

export interface DecomposedIntent {
  rawPrompt: string;
  category: IntentCategory;
  primaryObjective: string;
  extractedEntities: Record<string, any>;
  suggestedProjectName?: string;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresUserApproval: boolean;
  approvalReason?: string;
  suggestedAgents: string[];
  requiredCapabilities: string[];
  subtasks: DecomposedTask[];
  timestamp: string;
}

export class IntentEngine {
  private static instance: IntentEngine;
  private bus = AISystemBus.getInstance();

  private constructor() {}

  public static getInstance(): IntentEngine {
    if (!IntentEngine.instance) {
      IntentEngine.instance = new IntentEngine();
    }
    return IntentEngine.instance;
  }

  public decompose(prompt: string, options?: { currentProjectId?: string }): DecomposedIntent {
    const text = prompt.trim();
    const lower = text.toLowerCase();
    const policy = PAIOSPolicyEngine.getInstance();

    let category: IntentCategory = 'conversational';
    const suggestedAgents: string[] = [];
    const requiredCapabilities: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal';
    const subtasks: DecomposedTask[] = [];
    const entities: Record<string, any> = {};

    // Pattern matching & heuristic decomposition
    if (lower.includes('pentest') || lower.includes('vulnerability') || lower.includes('nmap') || lower.includes('cve') || lower.includes('exploit') || lower.includes('security audit') || lower.includes('security scan') || lower.includes('cluster security')) {
      category = 'security_pentest';
      suggestedAgents.push('security-pentester', 'recon-agent');
      requiredCapabilities.push('authorized-security', 'network-scanner');
      riskLevel = 'high';
      subtasks.push(
        { step: 1, description: 'Verify authorized scope and targets', suggestedAgent: 'security-pentester', requiredCapabilities: ['authorized-security'], isHighRisk: false },
        { step: 2, description: 'Conduct reconnaissance and enumeration', suggestedAgent: 'recon-agent', requiredCapabilities: ['network-scanner'], isHighRisk: false },
        { step: 3, description: 'Evaluate vulnerabilities safely', suggestedAgent: 'security-pentester', requiredCapabilities: ['authorized-security'], isHighRisk: true }
      );
    } else if (lower.includes('soc') || lower.includes('incident') || lower.includes('alert') || lower.includes('siem') || lower.includes('log analysis')) {
      category = 'security_soc';
      suggestedAgents.push('soc-analyst', 'threat-hunter');
      requiredCapabilities.push('defensive-soc', 'log-analyzer');
      riskLevel = 'medium';
    } else if (lower.includes('deploy') || lower.includes('kubernetes') || lower.includes('docker') || lower.includes('ci/cd') || lower.includes('pipeline') || lower.includes('aws') || lower.includes('terraform')) {
      category = 'devops';
      suggestedAgents.push('devops-engineer', 'sre-agent');
      requiredCapabilities.push('shell-exec', 'cloud-provider', 'docker');
      riskLevel = 'high';
      subtasks.push(
        { step: 1, description: 'Validate build configuration and environment', suggestedAgent: 'devops-engineer', requiredCapabilities: ['shell-exec'], isHighRisk: false },
        { step: 2, description: 'Execute deployment script', suggestedAgent: 'devops-engineer', requiredCapabilities: ['cloud-provider'], isHighRisk: true }
      );
    } else if (lower.includes('code') || lower.includes('fix bug') || lower.includes('refactor') || lower.includes('implement') || lower.includes('typescript') || lower.includes('python') || lower.includes('test') || lower.includes('pull request')) {
      category = 'coding';
      suggestedAgents.push('software-engineer', 'code-reviewer');
      requiredCapabilities.push('code-editor', 'git', 'terminal');
      riskLevel = 'low';
      subtasks.push(
        { step: 1, description: 'Analyze code repository and requirements', suggestedAgent: 'software-engineer', requiredCapabilities: ['code-editor'], isHighRisk: false },
        { step: 2, description: 'Generate implementation changes', suggestedAgent: 'software-engineer', requiredCapabilities: ['code-editor'], isHighRisk: false },
        { step: 3, description: 'Run test suites and verify', suggestedAgent: 'code-reviewer', requiredCapabilities: ['terminal'], isHighRisk: false }
      );
    } else if (lower.includes('search') || lower.includes('research') || lower.includes('find out') || lower.includes('summarize paper') || lower.includes('investigate')) {
      category = 'research';
      suggestedAgents.push('research-assistant', 'fact-checker');
      requiredCapabilities.push('web-search', 'browser', 'memory');
      riskLevel = 'low';
    } else if (lower.includes('browse') || lower.includes('scrape') || lower.includes('open website') || lower.includes('click') || lower.includes('fill form')) {
      category = 'browser';
      suggestedAgents.push('browser-automation-agent');
      requiredCapabilities.push('browser', 'devtools');
      riskLevel = 'medium';
    } else if (lower.includes('email') || lower.includes('calendar') || lower.includes('schedule meeting') || lower.includes('send mail') || lower.includes('inbox')) {
      category = 'email_calendar';
      suggestedAgents.push('executive-assistant');
      requiredCapabilities.push('email-provider', 'calendar-provider');
      riskLevel = lower.includes('send') ? 'medium' : 'low';
    } else if (lower.includes('workflow') || lower.includes('cron') || lower.includes('automation') || lower.includes('trigger every')) {
      category = 'workflow';
      suggestedAgents.push('workflow-orchestrator');
      requiredCapabilities.push('automation-engine', 'scheduler');
      riskLevel = 'medium';
    } else if (lower.includes('switch mode') || lower.includes('privacy') || lower.includes('offline') || lower.includes('air-gapped') || lower.includes('profile')) {
      category = 'system_control';
      suggestedAgents.push('system-supervisor');
      requiredCapabilities.push('paios-policy', 'identity-manager');
      riskLevel = 'low';
    } else if (lower.includes('project') || lower.includes('workspace') || lower.includes('continue my') || lower.includes('task list')) {
      category = 'project_management';
      suggestedAgents.push('project-manager');
      requiredCapabilities.push('project-store', 'memory');
      riskLevel = 'low';
    } else {
      category = 'conversational';
      suggestedAgents.push('general-assistant');
      requiredCapabilities.push('memory', 'ai-model');
      riskLevel = 'low';
    }

    // Entity extraction: Project extraction heuristics
    const projectMatch = text.match(/(?:project|on|for)\s+([A-Za-z0-9_-]+)/i);
    if (projectMatch && projectMatch[1]) {
      entities.project = projectMatch[1];
    } else if (options?.currentProjectId) {
      entities.project = options.currentProjectId;
    }

    // Urgency heuristics
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately') || lower.includes('emergency')) {
      urgency = 'critical';
    } else if (lower.includes('soon') || lower.includes('priority')) {
      urgency = 'high';
    }

    // Approval gating check via policy engine
    const isEgress = requiredCapabilities.includes('email-provider') || requiredCapabilities.includes('cloud-provider');
    const policyDecision = policy.evaluate({
      action: text.slice(0, 100),
      category: riskLevel === 'high' ? 'command_exec' : isEgress ? 'network_egress' : 'general',
      metadata: { highRisk: riskLevel === 'high' },
    });

    const intent: DecomposedIntent = {
      rawPrompt: text,
      category,
      primaryObjective: text,
      extractedEntities: entities,
      suggestedProjectName: entities.project,
      urgency,
      riskLevel,
      requiresUserApproval: policyDecision.requiresUserApproval,
      approvalReason: policyDecision.approvalPrompt,
      suggestedAgents,
      requiredCapabilities,
      subtasks,
      timestamp: new Date().toISOString(),
    };

    this.bus.emit({
      type: 'intent.decomposed',
      source: 'IntentEngine',
      data: {
        category,
        riskLevel,
        urgency,
        suggestedAgents,
        requiresApproval: intent.requiresUserApproval,
      },
    });

    return intent;
  }
}
