import { RiskLevel, RiskEvaluation, SecurityPolicy } from './types.js';

export class SafetyClassifier {
  private policy: SecurityPolicy;

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      killSwitchActive: process.env.JARVIS_KILL_SWITCH === 'true',
      maxAutoApproveRisk: (process.env.JARVIS_MAX_AUTO_APPROVE_RISK as RiskLevel) || 'LOW',
      whitelistedTools: [],
      blacklistedTools: [],
      ...policy
    };
  }

  public setKillSwitch(active: boolean): void {
    this.policy.killSwitchActive = active;
  }

  public isKillSwitchActive(): boolean {
    return this.policy.killSwitchActive;
  }

  public evaluateToolRisk(toolName: string, declaredRisk: RiskLevel, payload: Record<string, unknown>): RiskEvaluation {
    if (this.policy.killSwitchActive) {
      return {
        actionName: toolName,
        riskLevel: 'CRITICAL',
        requiresApproval: true,
        rationale: 'JARVIS Master Kill-Switch is ACTIVE. All tool actions are blocked.'
      };
    }

    if (this.policy.blacklistedTools.includes(toolName)) {
      return {
        actionName: toolName,
        riskLevel: 'CRITICAL',
        requiresApproval: true,
        rationale: `Tool ${toolName} is explicitly blacklisted.`
      };
    }

    let dynamicRisk = declaredRisk;

    // Detect dangerous payload patterns (e.g., shell injection, rm -rf, drop database)
    const payloadStr = JSON.stringify(payload).toLowerCase();
    if (
      payloadStr.includes('rm -rf') ||
      payloadStr.includes('drop table') ||
      payloadStr.includes('delete from') ||
      payloadStr.includes('format c:')
    ) {
      dynamicRisk = 'CRITICAL';
    } else if (
      payloadStr.includes('write') ||
      payloadStr.includes('modify') ||
      payloadStr.includes('update')
    ) {
      if (dynamicRisk === 'LOW') dynamicRisk = 'MEDIUM';
    }

    const riskRanking: Record<RiskLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };

    const requiresApproval = riskRanking[dynamicRisk] > riskRanking[this.policy.maxAutoApproveRisk];

    return {
      actionName: toolName,
      riskLevel: dynamicRisk,
      requiresApproval,
      rationale: requiresApproval
        ? `Risk level ${dynamicRisk} exceeds maximum auto-approval threshold ${this.policy.maxAutoApproveRisk}`
        : `Auto-approved: Risk level ${dynamicRisk} within threshold.`
    };
  }

  public sanitizeInput(rawInput: string): string {
    // Strip control characters, keep utf-8 text
    return rawInput.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '').trim();
  }
}
