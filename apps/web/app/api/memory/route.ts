import { NextRequest, NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function GET(req: NextRequest) {
  const kernel = PAIOSKernel.getInstance();
  await kernel.boot();
  
  const { searchParams } = new URL(req.url);
  const queryText = searchParams.get('query');

  if (queryText) {
    const results = kernel.knowledge.search(queryText);
    return NextResponse.json({ results });
  }

  const all = kernel.knowledge.getVaultMap();
  return NextResponse.json({ memories: all });
}

export async function POST(req: NextRequest) {
  try {
    const kernel = PAIOSKernel.getInstance();
    await kernel.boot();
    
    const body = await req.json();
    const { content, memory_type, title, tags = [] } = body;

    if (!content || !title) {
      return NextResponse.json({ error: 'content and title are required' }, { status: 400 });
    }

    const relPath = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    
    const saved = await kernel.knowledge.writeNote(relPath, content, {
      type: memory_type || 'note',
      tags,
      source: 'api'
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
