import { NextRequest, NextResponse } from 'next/server';
import { ResearchOrchestrator } from '@/research/core/orchestrator';

const orchestrator = ResearchOrchestrator.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claim } = body;

    if (!claim) {
      return NextResponse.json({ error: 'claim is required' }, { status: 400 });
    }

    const verified = await orchestrator.verifyClaim(String(claim));
    return NextResponse.json({ claim: verified });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
