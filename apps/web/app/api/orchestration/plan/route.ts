import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrationEngine } from '@/orchestration/orchestrator';

const orchestrator = AgentOrchestrationEngine.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, context } = body;

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json({ error: 'goal is required and must be a string' }, { status: 400 });
    }

    const plan = await orchestrator.planWorkflow(goal, context || {});
    return NextResponse.json({ success: true, plan });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
