import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrationEngine } from '@/orchestration/orchestrator';

const orchestrator = AgentOrchestrationEngine.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || undefined;
    const runId = searchParams.get('runId');

    if (runId) {
      const run = await orchestrator.getWorkflowStatus(runId);
      if (!run) {
        return NextResponse.json({ error: `Workflow run ${runId} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, workflow: run });
    }

    const workflows = await orchestrator.listWorkflows(limit, status);
    return NextResponse.json({ success: true, workflows });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, runId, goal, userId, sessionId, priority, budgetLimit, tokenBudget, maxTimeMs, reason } = body;

    // Handle workflow lifecycle actions
    if (action === 'start') {
      if (!runId) return NextResponse.json({ error: 'runId is required to start workflow' }, { status: 400 });
      const result = await orchestrator.executeWorkflow(runId);
      return NextResponse.json({ success: result.status === 'COMPLETED', result });
    }

    if (action === 'pause') {
      if (!runId) return NextResponse.json({ error: 'runId is required to pause workflow' }, { status: 400 });
      const paused = await orchestrator.pauseWorkflow(runId);
      return NextResponse.json({ success: paused });
    }

    if (action === 'resume') {
      if (!runId) return NextResponse.json({ error: 'runId is required to resume workflow' }, { status: 400 });
      const resumed = await orchestrator.resumeWorkflow(runId);
      return NextResponse.json({ success: resumed });
    }

    if (action === 'cancel') {
      if (!runId) return NextResponse.json({ error: 'runId is required to cancel workflow' }, { status: 400 });
      const canceled = await orchestrator.cancelWorkflow(runId, reason || 'Cancelled by user');
      return NextResponse.json({ success: canceled });
    }

    // Default POST: Create new workflow
    if (!goal) {
      return NextResponse.json({ error: 'goal is required to create a workflow' }, { status: 400 });
    }

    const workflow = await orchestrator.createWorkflow({
      goal,
      userId: userId || 'usr_web_client',
      sessionId,
      priority,
      budgetLimit,
      tokenBudget,
      maxTimeMs,
    });

    return NextResponse.json({ success: true, workflow });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
