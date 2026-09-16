import { NextRequest, NextResponse } from 'next/server';
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, startUrl, maxSteps, profileId, sessionId } = body;

    if (!goal) {
      return NextResponse.json({ error: 'goal parameter is required' }, { status: 400 });
    }

    const taskResult = await orchestrator.runAgent({
      goal,
      startUrl,
      maxSteps: maxSteps || 10,
      profileId,
      sessionId,
    });

    return NextResponse.json({
      success: taskResult.status === 'completed',
      task: taskResult,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
