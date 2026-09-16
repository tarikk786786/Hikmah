import { NextRequest, NextResponse } from 'next/server';
import { PAIOSPolicyEngine, PrivacyMode } from '@/paio/policy/paios-policy-engine';

export async function GET() {
  try {
    const policy = PAIOSPolicyEngine.getInstance();
    const mode = policy.getPrivacyMode();
    const pendingApprovals = policy.listPendingApprovals();
    return NextResponse.json({ success: true, privacyMode: mode, pendingApprovals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch privacy settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const policy = PAIOSPolicyEngine.getInstance();

    if (body.action === 'resolve_approval') {
      const ok = policy.resolveApproval(body.approvalId, body.approved);
      return NextResponse.json({ success: ok });
    }

    if (body.mode) {
      policy.setPrivacyMode(body.mode as PrivacyMode, body.reason);
      return NextResponse.json({ success: true, privacyMode: policy.getPrivacyMode() });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update privacy settings' }, { status: 500 });
  }
}
