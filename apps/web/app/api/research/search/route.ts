import { NextRequest, NextResponse } from 'next/server';
import { SearchRouter } from '@/research/core/search-router';
import { SearchIntent } from '@/research/core/types';

const searchRouter = new SearchRouter();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const intent = (searchParams.get('intent') as SearchIntent) || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 5;

    if (!query) {
      return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
    }

    const results = await searchRouter.search(query, { intent, limit });
    return NextResponse.json({ query, intent, count: results.length, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
