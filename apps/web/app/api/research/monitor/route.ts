import { NextRequest, NextResponse } from 'next/server';
import { ResearchMonitorEngine } from '@/research/core/monitor-engine';

const monitorEngine = new ResearchMonitorEngine();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monitorId = searchParams.get('id');
    const userId = searchParams.get('userId') || undefined;

    if (monitorId) {
      const job = monitorEngine.getJob(monitorId);
      if (!job) {
        return NextResponse.json({ error: `Monitor ${monitorId} not found` }, { status: 404 });
      }
      const history = monitorEngine.getDiffHistory(monitorId);
      return NextResponse.json({ job, history });
    }

    const jobs = monitorEngine.listJobs(userId);
    return NextResponse.json({ jobs, count: jobs.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, targetUrls, frequencyMinutes, userId, checkImmediately, monitorId } = body;

    // Check existing monitor job
    if (monitorId && checkImmediately) {
      const diffs = await monitorEngine.checkMonitorJob(monitorId);
      return NextResponse.json({ monitorId, diffs, count: diffs.length });
    }

    if (!title || !targetUrls || !Array.isArray(targetUrls)) {
      return NextResponse.json({ error: 'title and targetUrls array required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const job = monitorEngine.registerJob({
      id: `mon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      targetUrls,
      frequencyMinutes: frequencyMinutes ? Number(frequencyMinutes) : 60,
      active: true,
      userId: userId || 'usr_default',
      createdAt: now,
      updatedAt: now,
    });

    let diffs = undefined;
    if (checkImmediately) {
      diffs = await monitorEngine.checkMonitorJob(job.id);
    }

    return NextResponse.json({ job, diffs });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
