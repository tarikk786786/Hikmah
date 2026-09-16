import { NextRequest, NextResponse } from 'next/server';
import { StorageOrchestrator } from '@/storage/core/orchestrator';
import { StorageTier } from '@/storage/core/types';

const orchestrator = StorageOrchestrator.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const tier = searchParams.get('tier') as StorageTier | null;
    const prefix = searchParams.get('prefix');
    const userId = searchParams.get('userId');

    let objects;
    if (query) {
      objects = await orchestrator.search(query, {
        tier: tier || undefined,
        prefix: prefix || undefined,
        userId: userId || undefined
      });
    } else {
      objects = await orchestrator.list({
        tier: tier || undefined,
        prefix: prefix || undefined,
        userId: userId || undefined
      });
    }

    return NextResponse.json({ objects, count: objects.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
