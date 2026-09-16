import { NextRequest, NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, userId = 'usr_default', projectId, classification, authority } = body;

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const saved = await router.remember({
      content,
      userId,
      projectId,
      classification,
      authority
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
