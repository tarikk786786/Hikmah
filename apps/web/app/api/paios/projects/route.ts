import { NextRequest, NextResponse } from 'next/server';
import { ProjectManager } from '@/paio/projects/project-manager';

export async function GET() {
  try {
    const projectMgr = ProjectManager.getInstance();
    const active = projectMgr.getActiveProject();
    const projects = projectMgr.listProjects();
    return NextResponse.json({ success: true, activeProject: active, projects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectMgr = ProjectManager.getInstance();

    if (body.action === 'set_active') {
      const active = projectMgr.setActiveProject(body.projectId);
      return NextResponse.json({ success: true, activeProject: active });
    }

    if (body.action === 'briefing') {
      const briefing = projectMgr.getContinuityBriefing(body.projectId);
      return NextResponse.json({ success: true, briefing });
    }

    const newProject = projectMgr.createProject({
      name: body.name,
      slug: body.slug,
      description: body.description,
      userId: body.userId || 'user_master_owner',
      currentGoal: body.currentGoal,
      tags: body.tags,
    });

    return NextResponse.json({ success: true, project: newProject });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to process project action' }, { status: 500 });
  }
}
