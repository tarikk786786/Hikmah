import { NextRequest, NextResponse } from 'next/server';
import { StorageOrchestrator } from '@/storage/core/orchestrator';

const orchestrator = StorageOrchestrator.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      key,
      data,
      isBase64,
      mimeType,
      tier,
      classification,
      encrypt,
      userId = 'usr_default',
      projectId,
      metadata
    } = body;

    if (!key || data === undefined) {
      return NextResponse.json({ error: 'key and data are required' }, { status: 400 });
    }

    const buffer = isBase64
      ? Buffer.from(String(data), 'base64')
      : Buffer.from(String(data), 'utf-8');

    const obj = await orchestrator.put({
      key,
      data: buffer,
      mimeType,
      tier,
      classification,
      encrypt: Boolean(encrypt),
      userId,
      projectId,
      metadata
    });

    return NextResponse.json(obj, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
