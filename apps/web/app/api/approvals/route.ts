import { NextRequest, NextResponse } from 'next/server';
import { ApprovalManager } from '@/security/approvals/manager';

export async function GET() {
  const pending = ApprovalManager.listPending();
  return NextResponse.json({ pending });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, approved } = body;

    if (!id || approved === undefined) {
      return NextResponse.json({ error: 'id and approved boolean are required' }, { status: 400 });
    }

    const resolved = ApprovalManager.resolveRequest(id, Boolean(approved));
    if (!resolved) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: resolved });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
