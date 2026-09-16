import { NextResponse } from 'next/server';
import { SkillIntelligenceEngine } from '../../../../../skills/intelligence/skill-intelligence-engine.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'installed' | 'available' | 'all'
    const engine = SkillIntelligenceEngine.getInstance();

    let skills;
    if (filter === 'installed') {
      skills = engine.registry.listInstalledSkills();
    } else if (filter === 'available') {
      skills = engine.registry.listAvailableSkills();
    } else {
      skills = engine.registry.listAllSkills();
    }

    const allStats = engine.analytics.getAllStats();
    const recommendations = engine.getOptimizationRecommendations();

    return NextResponse.json({
      success: true,
      count: skills.length,
      skills: skills.map(s => ({
        ...s,
        isInstalled: engine.registry.isInstalled(s.id),
        stats: allStats[s.id] || null,
      })),
      recommendations,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, skillId, force } = body;
    const engine = SkillIntelligenceEngine.getInstance();

    if (action === 'install') {
      const result = await engine.installSkill(skillId, { force: Boolean(force) });
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === 'uninstall') {
      const ok = engine.uninstallSkill(skillId);
      return NextResponse.json({ success: ok, skillId });
    }

    if (action === 'rollback') {
      const res = engine.rollbackSkill(skillId);
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
