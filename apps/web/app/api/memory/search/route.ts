import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queryText, userId = 'usr_default', projectId, targetProvider, classifications, limit = 10 } = body;

    if (!queryText) {
      return NextResponse.json({ error: 'queryText is required' }, { status: 400 });
    }

    const results = await router.search({
      queryText,
      userId,
      projectId,
      targetProvider,
      classifications,
      limit: Number(limit)
    });

    return NextResponse.json({ results, count: results.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
