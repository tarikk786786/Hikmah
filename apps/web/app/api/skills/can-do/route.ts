import { NextResponse } from 'next/server';
import { SkillIntelligenceEngine } from '../../../../../../skills/intelligence/skill-intelligence-engine.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intent } = body;
    if (!intent) {
      return NextResponse.json({ success: false, error: 'Intent is required' }, { status: 400 });
    }

    const engine = SkillIntelligenceEngine.getInstance();
    const assessment = engine.canHikmahDoThis(intent);
    return NextResponse.json({ success: true, assessment });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
