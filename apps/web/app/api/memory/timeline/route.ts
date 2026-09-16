import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'usr_default', projectId, entityId, limit = 20 } = body;

    const timeline = await router.timeline({
      userId,
      projectId,
      entityId,
      limit: Number(limit)
    });

    return NextResponse.json({ timeline, count: timeline.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
