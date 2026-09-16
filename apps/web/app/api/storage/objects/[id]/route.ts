import { NextRequest, NextResponse } from 'next/server';
import { StorageOrchestrator } from '@/storage/core/orchestrator';

const orchestrator = StorageOrchestrator.getInstance();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meta = await orchestrator.metadata(id);
    return NextResponse.json(meta);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const purge = searchParams.get('purge') === 'true';

    const deleted = await orchestrator.delete(id, { purge });
    return NextResponse.json({ success: deleted, id, purged: purge });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
