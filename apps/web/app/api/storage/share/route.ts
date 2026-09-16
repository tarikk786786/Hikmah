import { NextRequest, NextResponse } from 'next/server';
import { StorageOrchestrator } from '@/storage/core/orchestrator';

const orchestrator = StorageOrchestrator.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyOrId, accessLevel, expiresInSeconds, password, userId } = body;

    if (!keyOrId) {
      return NextResponse.json({ error: 'keyOrId is required' }, { status: 400 });
    }

    const share = await orchestrator.share(keyOrId, {
      accessLevel,
      expiresInSeconds,
      password,
      userId
    });

    return NextResponse.json(share, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenOrId = searchParams.get('token') || searchParams.get('id');

    if (!tokenOrId) {
      return NextResponse.json({ error: 'token or id query param required' }, { status: 400 });
    }

    const revoked = await orchestrator.revokeShare(tokenOrId);
    return NextResponse.json({ success: revoked });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
