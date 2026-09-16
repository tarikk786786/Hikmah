import { NextResponse } from 'next/server';
import { SkillIntelligenceEngine } from '../../../../../../skills/intelligence/skill-intelligence-engine.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query = '', filters } = body;
    const engine = SkillIntelligenceEngine.getInstance();
    const results = engine.searchSkills(query, filters);
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
