import { NextResponse } from 'next/server';
import { MemoryRouter } from '@/memory/core/router/router';


const router = MemoryRouter.getInstance();

export async function GET() {
  try {
    const healthList = await router.healthCheckAll();
    const providers = router.listProviders().map((p) => ({
      id: p.id,
      name: p.name,
      primaryClassifications: p.primaryClassifications
    }));

    return NextResponse.json({
      providers,
      health: healthList
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
