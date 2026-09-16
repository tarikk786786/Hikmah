import { NextRequest, NextResponse } from 'next/server';
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, sessionId, waitUntil, timeoutMs } = body;

    if (!url) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const session = await orchestrator.createSession();
      activeSessionId = session.id;
    }

    const result = await orchestrator.navigate(activeSessionId, url, {
      waitUntil,
      timeoutMs,
    });

    const session = orchestrator.getSession(activeSessionId);

    return NextResponse.json({
      success: result.success,
      sessionId: activeSessionId,
      session,
      result,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
