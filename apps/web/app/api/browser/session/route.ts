import { NextRequest, NextResponse } from 'next/server';
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeClosed = searchParams.get('includeClosed') === 'true';

    const sessions = orchestrator.listSessions(includeClosed);
    const profiles = orchestrator.listProfiles();

    return NextResponse.json({ sessions, profiles, activeCount: sessions.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'close' && body.sessionId) {
      const closed = await orchestrator.closeSession(body.sessionId);
      return NextResponse.json({ success: closed, sessionId: body.sessionId });
    }

    if (body.action === 'create_profile') {
      const profile = orchestrator.createProfile({
        name: body.name || 'Custom Profile',
        userAgent: body.userAgent,
        viewport: body.viewport,
        proxy: body.proxy,
      });
      return NextResponse.json({ profile });
    }

    // Default: Create session
    const session = await orchestrator.createSession({
      profileId: body.profileId,
      browserType: body.browserType,
      metadata: body.metadata,
    });

    return NextResponse.json({ session });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
