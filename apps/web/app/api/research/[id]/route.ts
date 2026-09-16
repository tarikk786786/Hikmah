import { NextRequest, NextResponse } from 'next/server';
import { ResearchOrchestrator } from '@/research/core/orchestrator';

const orchestrator = ResearchOrchestrator.getInstance();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = orchestrator.getTask(id);
    if (!task) {
      return NextResponse.json({ error: `Research task ${id} not found` }, { status: 404 });
    }

    const report = orchestrator.getReport(id);
    return NextResponse.json({ task, report });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
