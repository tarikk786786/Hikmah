import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queryText, userId = 'usr_default', projectId, limit = 10 } = body;

    if (!queryText) {
      return NextResponse.json({ error: 'queryText is required' }, { status: 400 });
    }

    const memories = await router.recall({
      queryText,
      userId,
      projectId,
      limit: Number(limit)
    });

    return NextResponse.json({ memories, count: memories.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
