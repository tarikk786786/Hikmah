import { NextResponse } from 'next/server';
import { SkillIntelligenceEngine } from '../../../../../../skills/intelligence/skill-intelligence-engine.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skillId } = body;
    if (!skillId) {
      return NextResponse.json({ success: false, error: 'skillId is required' }, { status: 400 });
    }

    const engine = SkillIntelligenceEngine.getInstance();
    const scanResult = await engine.scanSkill(skillId);
    if (!scanResult) {
      return NextResponse.json({ success: false, error: `Skill '${skillId}' not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, scanResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
