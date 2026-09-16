import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scope = 'PROJECT', userId = 'usr_default', projectId } = body;

    const res = await router.consolidate(scope, userId, projectId);
    return NextResponse.json(res);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
