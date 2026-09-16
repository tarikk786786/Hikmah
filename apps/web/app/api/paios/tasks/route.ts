import { NextRequest, NextResponse } from 'next/server';
import { TaskManager } from '@/paio/tasks/task-manager';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;
    const status = (searchParams.get('status') as any) || undefined;

    const taskMgr = TaskManager.getInstance();
    const tasks = taskMgr.listTasks({ projectId, status });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to list tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const taskMgr = TaskManager.getInstance();

    if (body.action === 'complete') {
      const task = taskMgr.completeTask(body.taskId);
      return NextResponse.json({ success: true, task });
    }

    const newTask = taskMgr.createTask({
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      priority: body.priority,
      assignedAgentId: body.assignedAgentId,
      subtasks: body.subtasks,
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to manage task' }, { status: 500 });
  }
}
