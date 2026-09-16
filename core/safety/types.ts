export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityPolicy {
  killSwitchActive: boolean;
  maxAutoApproveRisk: RiskLevel;
  whitelistedTools: string[];
  blacklistedTools: string[];
}

export interface RiskEvaluation {
  actionName: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  rationale: string;
}

export interface ApprovalRequest {
  id: string;
  userId: string;
  actionName: string;
  riskLevel: RiskLevel;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}
