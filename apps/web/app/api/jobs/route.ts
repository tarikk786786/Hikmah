import { NextRequest, NextResponse } from 'next/server';
import { TaskQueue } from '@/workflows/queue/queue';
import { setupWorkers } from '@/workers/agent-worker/index';

const queue = new TaskQueue();
setupWorkers(queue);

export async function GET() {
  const jobs = queue.listJobs();
  return NextResponse.json({
    queueLength: queue.getQueueLength(),
    jobs
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload, userId = 'usr_default', priority = 5 } = body;

    if (!type || !payload) {
      return NextResponse.json({ error: 'type and payload are required' }, { status: 400 });
    }

    const job = await queue.enqueue(type, payload, userId, priority);
    return NextResponse.json(job, { status: 202 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
