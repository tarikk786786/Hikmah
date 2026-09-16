import { NextResponse } from 'next/server';
import { SkillIntelligenceEngine } from '../../../../../../skills/intelligence/skill-intelligence-engine.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { skillIds, name, description } = body;

    if (!Array.isArray(skillIds) || skillIds.length < 2 || !name || !description) {
      return NextResponse.json(
        { success: false, error: 'skillIds (min 2), name, and description are required' },
        { status: 400 }
      );
    }

    const engine = SkillIntelligenceEngine.getInstance();
    const result = await engine.composeSkills(skillIds, name, description);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
