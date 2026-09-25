import { NextRequest, NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function GET() {
  const kernel = PAIOSKernel.getInstance();
  const jobs = kernel.jobs.listJobs();
  return NextResponse.json({
    queueLength: jobs.filter(j => j.status === 'queued' || j.status === 'active').length,
    jobs
  });
}

export async function POST(req: NextRequest) {
  try {
    const kernel = PAIOSKernel.getInstance();
    await kernel.boot(); // Ensure harness is initialized

    const body = await req.json();
    const { type, payload, priority = 'normal' } = body;

    if (!type || !payload) {
      return NextResponse.json({ error: 'type and payload are required' }, { status: 400 });
    }

    const jobId = await kernel.jobs.enqueue(type, payload, priority);
    const job = kernel.jobs.getJob(jobId);
    
    return NextResponse.json(job, { status: 202 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
