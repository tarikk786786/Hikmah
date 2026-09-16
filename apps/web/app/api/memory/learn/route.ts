import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rule, userId = 'usr_default', projectId } = body;

    if (!rule) {
      return NextResponse.json({ error: 'rule is required' }, { status: 400 });
    }

    const saved = await router.learn({
      content: rule,
      userId,
      projectId
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
