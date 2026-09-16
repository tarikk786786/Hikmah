import { v4 as uuidv4 } from 'uuid';
import { RiskLevel, ApprovalRequest } from '../../core/safety/types.js';

export class ApprovalManager {
  private static pendingApprovals: Map<string, ApprovalRequest> = new Map();

  public static createRequest(
    userId: string,
    actionName: string,
    riskLevel: RiskLevel,
    payload: Record<string, unknown>
  ): ApprovalRequest {
    const id = `appr_${uuidv4().substring(0, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min TTL

    const req: ApprovalRequest = {
      id,
      userId,
      actionName,
      riskLevel,
      payload,
      status: 'pending',
      createdAt: now,
      expiresAt
    };

    ApprovalManager.pendingApprovals.set(id, req);
    return req;
  }

  public static getRequest(id: string): ApprovalRequest | undefined {
    const req = ApprovalManager.pendingApprovals.get(id);
    if (!req) return undefined;
    if (new Date() > req.expiresAt && req.status === 'pending') {
      req.status = 'expired';
    }
    return req;
  }

  public static resolveRequest(id: string, approved: boolean): ApprovalRequest | undefined {
    const req = ApprovalManager.getRequest(id);
    if (!req) return undefined;
    if (req.status !== 'pending') return req;

    req.status = approved ? 'approved' : 'rejected';
    return req;
  }

  public static listPending(): ApprovalRequest[] {
    const now = new Date();
    const result: ApprovalRequest[] = [];
    for (const req of ApprovalManager.pendingApprovals.values()) {
      if (req.status === 'pending' && now <= req.expiresAt) {
        result.push(req);
      }
    }
    return result;
  }
}
