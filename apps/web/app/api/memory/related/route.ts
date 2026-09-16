import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityId, userId = 'usr_default', projectId } = body;

    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    const related = await router.related({
      entityId,
      userId,
      projectId
    });

    return NextResponse.json({ related, count: related.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
