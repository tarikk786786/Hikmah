import { NextResponse } from 'next/server';
import { StorageRouter } from '@/storage/core/router';

const router = StorageRouter.getInstance();

export async function GET() {
  try {
    const health = await router.getHealthReport();
    return NextResponse.json({ providers: health, count: health.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
