import { NextResponse } from 'next/server';
import { SkillIntelligenceEngine } from '../../../../../../skills/intelligence/skill-intelligence-engine.js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = SkillIntelligenceEngine.getInstance();
    const inspection = await engine.inspectSkill(id);

    if (!inspection) {
      return NextResponse.json({ success: false, error: `Skill '${id}' not found` }, { status: 404 });
    }

    const stats = engine.analytics.getStats(id);
    const auditLog = engine.monitor.getAuditLog(id);
    const killSwitchHistory = engine.killSwitch.getHistory(id);

    return NextResponse.json({
      success: true,
      ...inspection,
      stats,
      auditLog,
      killSwitchHistory,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const engine = SkillIntelligenceEngine.getInstance();

    if (body.enabled !== undefined) {
      const ok = engine.enableSkill(id, Boolean(body.enabled));
      return NextResponse.json({ success: ok, skillId: id, enabled: body.enabled });
    }

    if (body.action === 'quarantine') {
      const rec = engine.quarantineSkill(id, body.reason || 'Manual quarantine from Web UI', body.evidence);
      return NextResponse.json({ success: true, record: rec });
    }

    return NextResponse.json({ success: false, error: 'Unsupported update action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = SkillIntelligenceEngine.getInstance();
    const ok = engine.uninstallSkill(id);
    return NextResponse.json({ success: ok, skillId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
