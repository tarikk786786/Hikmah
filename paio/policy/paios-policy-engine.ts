import { AISystemBus } from '../events/ai-system-bus';
import { IdentityManager } from '../identity/identity-manager';

export type PrivacyMode = 'normal' | 'private' | 'offline' | 'air-gapped';

export interface PolicyEvaluationRequest {
  action: string;
  category: 'model_call' | 'network_egress' | 'filesystem_write' | 'command_exec' | 'email_send' | 'data_export' | 'code_eval' | 'general';
  targetResource?: string;
  provider?: string;
  isCloudProvider?: boolean;
  requiredTier?: number;
  userId?: string;
  profileId?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  privacyMode: PrivacyMode;
  requiresUserApproval: boolean;
  approvalPrompt?: string;
  suggestedAlternative?: string;
  evaluatedAt: string;
}

export class PAIOSPolicyEngine {
  private static instance: PAIOSPolicyEngine;
  private currentPrivacyMode: PrivacyMode = 'normal';
  private autoApproveSafeActions: boolean = true;
  private bus = AISystemBus.getInstance();
  private pendingApprovals: Map<string, {
    id: string;
    request: PolicyEvaluationRequest;
    reason: string;
    createdAt: string;
    status: 'pending' | 'approved' | 'rejected';
  }> = new Map();

  private constructor() {}

  public static getInstance(): PAIOSPolicyEngine {
    if (!PAIOSPolicyEngine.instance) {
      PAIOSPolicyEngine.instance = new PAIOSPolicyEngine();
    }
    return PAIOSPolicyEngine.instance;
  }

  public getPrivacyMode(): PrivacyMode {
    return this.currentPrivacyMode;
  }

  public setPrivacyMode(mode: PrivacyMode, reason?: string): void {
    const previous = this.currentPrivacyMode;
    this.currentPrivacyMode = mode;
    this.bus.emit({
      type: 'policy.privacy_mode_changed',
      source: 'PAIOSPolicyEngine',
      data: {
        previousMode: previous,
        currentMode: mode,
        reason: reason || 'User or system policy adjustment',
      },
    });
  }

  public evaluate(request: PolicyEvaluationRequest): PolicyDecision {
    const now = new Date().toISOString();
    const mode = this.currentPrivacyMode;

    // Rule 1: Air-Gapped Mode
    if (mode === 'air-gapped') {
      if (request.category === 'network_egress' || request.isCloudProvider || request.category === 'email_send') {
        return {
          allowed: false,
          reason: `Action '${request.action}' blocked: Air-gapped privacy mode permits zero network egress or cloud interactions.`,
          privacyMode: mode,
          requiresUserApproval: false,
          suggestedAlternative: 'Use local offline models and local storage datasets.',
          evaluatedAt: now,
        };
      }
    }

    // Rule 2: Offline Mode
    if (mode === 'offline') {
      if (request.category === 'network_egress' || request.isCloudProvider) {
        return {
          allowed: false,
          reason: `Action '${request.action}' blocked: Offline privacy mode strictly forbids network connections.`,
          privacyMode: mode,
          requiresUserApproval: false,
          suggestedAlternative: 'Switch to local inference engines (Ollama, vLLM, llama.cpp).',
          evaluatedAt: now,
        };
      }
    }

    // Rule 3: Private Mode
    if (mode === 'private') {
      if (request.category === 'model_call' && request.isCloudProvider) {
        return {
          allowed: false,
          reason: `Action '${request.action}' blocked: Private mode does not allow external cloud model providers (${request.provider || 'cloud'}).`,
          privacyMode: mode,
          requiresUserApproval: false,
          suggestedAlternative: 'Route to self-hosted or local hardware AI model.',
          evaluatedAt: now,
        };
      }
    }

    // Rule 4: High-Risk Action Approval Gating (command_exec, filesystem destructive, email send)
    if (request.category === 'command_exec' || request.category === 'email_send') {
      const activeProfile = IdentityManager.getInstance().getActiveProfile();
      const autoApprove = activeProfile.preferences?.autoApproveSafeActions ?? this.autoApproveSafeActions;

      if (!autoApprove || (request.metadata && request.metadata.highRisk === true)) {
        return {
          allowed: true,
          reason: 'Action requires explicit user confirmation per security posture.',
          privacyMode: mode,
          requiresUserApproval: true,
          approvalPrompt: `Confirmation needed for ${request.category}: ${request.action}`,
          evaluatedAt: now,
        };
      }
    }

    return {
      allowed: true,
      reason: `Action conforms to ${mode} mode policy guidelines.`,
      privacyMode: mode,
      requiresUserApproval: false,
      evaluatedAt: now,
    };
  }

  public createApprovalRequest(request: PolicyEvaluationRequest, reason: string): string {
    const id = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.pendingApprovals.set(id, {
      id,
      request,
      reason,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    this.bus.emit({
      type: 'policy.approval_requested',
      source: 'PAIOSPolicyEngine',
      data: { approvalId: id, action: request.action, category: request.category },
    });

    return id;
  }

  public resolveApproval(id: string, approved: boolean): boolean {
    const item = this.pendingApprovals.get(id);
    if (!item) return false;
    item.status = approved ? 'approved' : 'rejected';
    this.bus.emit({
      type: approved ? 'policy.approval_granted' : 'policy.approval_rejected',
      source: 'PAIOSPolicyEngine',
      data: { approvalId: id, status: item.status },
    });
    return true;
  }

  public listPendingApprovals(): Array<{ id: string; request: PolicyEvaluationRequest; reason: string; createdAt: string }> {
    return Array.from(this.pendingApprovals.values())
      .filter(a => a.status === 'pending')
      .map(a => ({ id: a.id, request: a.request, reason: a.reason, createdAt: a.createdAt }));
  }
}
