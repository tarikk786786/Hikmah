import { NextRequest, NextResponse } from 'next/server';
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const mode = searchParams.get('mode') || 'dom'; // 'dom' | 'a11y' | 'observe'
    const query = searchParams.get('query') || undefined;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId parameter is required' }, { status: 400 });
    }

    if (mode === 'a11y') {
      const a11y = await orchestrator.extractAccessibilityTree(sessionId);
      return NextResponse.json({ mode: 'a11y', data: a11y });
    }

    if (mode === 'observe') {
      const observe = await orchestrator.observe(sessionId, query);
      return NextResponse.json({ mode: 'observe', data: observe });
    }

    const snapshot = await orchestrator.snapshotDOM(sessionId);
    return NextResponse.json({ mode: 'dom', data: snapshot });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, mode = 'dom', query, schema, instruction } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (mode === 'extract_semantic' && schema) {
      const extracted = await orchestrator.extractSemantic(sessionId, { schema, instruction });
      return NextResponse.json({ mode: 'extract_semantic', data: extracted });
    }

    if (mode === 'observe') {
      const observe = await orchestrator.observe(sessionId, query);
      return NextResponse.json({ mode: 'observe', data: observe });
    }

    if (mode === 'a11y') {
      const a11y = await orchestrator.extractAccessibilityTree(sessionId);
      return NextResponse.json({ mode: 'a11y', data: a11y });
    }

    const dom = await orchestrator.snapshotDOM(sessionId);
    return NextResponse.json({ mode: 'dom', data: dom });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
