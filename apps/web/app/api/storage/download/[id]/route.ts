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
    const data = await orchestrator.get(id);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.name)}"`,
        'X-Hikmah-Sha256': meta.sha256,
        'X-Hikmah-Tier': meta.tier
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
