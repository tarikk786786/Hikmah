import { NextRequest, NextResponse } from 'next/server';
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const asJson = searchParams.get('asJson') === 'true';
    const fullPage = searchParams.get('fullPage') === 'true';

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId parameter is required' }, { status: 400 });
    }

    const { buffer, storageKey } = await orchestrator.screenshot(sessionId, { fullPage });

    if (asJson) {
      return NextResponse.json({
        base64: buffer.toString('base64'),
        sizeBytes: buffer.length,
        storageKey,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, fullPage, type, persistToStorage, userId, asJson } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { buffer, storageKey } = await orchestrator.screenshot(sessionId, {
      fullPage,
      type,
      persistToStorage,
      userId,
    });

    if (asJson || persistToStorage) {
      return NextResponse.json({
        base64: buffer.toString('base64'),
        sizeBytes: buffer.length,
        storageKey,
      });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': type === 'jpeg' ? 'image/jpeg' : type === 'webp' ? 'image/webp' : 'image/png',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
