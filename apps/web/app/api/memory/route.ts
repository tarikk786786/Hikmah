import { NextRequest, NextResponse } from 'next/server';
import { MemoryStore } from '@/memory/long-term/store';

const memoryStore = new MemoryStore();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'usr_default';
  const queryText = searchParams.get('query');

  if (queryText) {
    const results = await memoryStore.retrieveRelevant({
      userId,
      queryText,
      limit: 10
    });
    return NextResponse.json({ results });
  }

  const all = await memoryStore.listAll(userId);
  return NextResponse.json({ memories: all });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, memory_type, importance = 5.0, user_id = 'usr_default' } = body;

    if (!content || !memory_type) {
      return NextResponse.json({ error: 'content and memory_type are required' }, { status: 400 });
    }

    const saved = await memoryStore.storeMemory({
      user_id,
      content,
      memory_type,
      importance: Number(importance),
      confidence: 1.0,
      source: 'api'
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
