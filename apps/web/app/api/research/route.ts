import { NextRequest, NextResponse } from 'next/server';
import { ResearchOrchestrator } from '@/research/core/orchestrator';
import { ResearchMode } from '@/research/core/types';

const orchestrator = ResearchOrchestrator.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const tasks = orchestrator.listTasks(userId);
    return NextResponse.json({ tasks, count: tasks.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, mode, userId, projectId, runImmediately, persistToStorage } = body;

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const task = await orchestrator.startResearch({
      question,
      mode: (mode as ResearchMode) || 'STANDARD',
      userId: userId || 'usr_default',
      projectId,
      persistToStorage: Boolean(persistToStorage),
    });

    if (runImmediately) {
      const report = await orchestrator.executePipeline(task.id, Boolean(persistToStorage));
      return NextResponse.json({ task, report });
    }

    // Execute in background
    orchestrator.executePipeline(task.id, Boolean(persistToStorage)).catch((e) => {
      console.error(`Background research execution error for ${task.id}:`, e);
    });

    return NextResponse.json({ task });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
