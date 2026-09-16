import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrationEngine } from '@/orchestration/orchestrator';

const orchestrator = AgentOrchestrationEngine.getInstance();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');
    const type = searchParams.get('type') || 'tasks';

    if (type === 'agents') {
      const agents = orchestrator.listAgents();
      return NextResponse.json({ success: true, agents });
    }

    if (type === 'leases') {
      const leases = await orchestrator.listActiveLeases(runId || undefined);
      return NextResponse.json({ success: true, leases });
    }

    if (type === 'artifacts') {
      if (!runId) return NextResponse.json({ error: 'runId is required for artifacts' }, { status: 400 });
      const artifacts = await orchestrator.listArtifacts(runId);
      return NextResponse.json({ success: true, artifacts });
    }

    if (type === 'approvals') {
      const approvals = await orchestrator.listPendingApprovals(runId || undefined);
      return NextResponse.json({ success: true, approvals });
    }

    if (type === 'status') {
      const status = await orchestrator.getStatus();
      return NextResponse.json({ success: true, status });
    }

    if (!runId) {
      return NextResponse.json({ error: 'runId is required to query tasks' }, { status: 400 });
    }

    const workflow = await orchestrator.getWorkflowStatus(runId);
    if (!workflow) {
      return NextResponse.json({ error: `Workflow ${runId} not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, tasks: workflow.tasks });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, agentRole, taskName, description, input, userId, approvalId, decision, comment, reviewerId } = body;

    if (action === 'execute_direct') {
      if (!agentRole || !taskName || !description) {
        return NextResponse.json({ error: 'agentRole, taskName, and description are required' }, { status: 400 });
      }

      const result = await orchestrator.executeDirectAgentTask(agentRole, {
        title: taskName,
        description,
        input: input || {},
        userId,
      });

      return NextResponse.json({ success: result.success, result });
    }

    if (action === 'approval_response') {
      if (!approvalId || !decision) {
        return NextResponse.json({ error: 'approvalId and decision are required' }, { status: 400 });
      }

      const resp = await orchestrator.respondToApproval({
        approvalId,
        decision,
        comment,
        reviewerId,
      });

      return NextResponse.json({ success: resp.success, result: resp });
    }

    return NextResponse.json({ error: `Unsupported task action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
