import { NextResponse } from 'next/server';
import { CapabilityEcosystemEngine } from '../../../../../capability-ecosystem/ecosystem-engine.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const engine = CapabilityEcosystemEngine.getInstance();
    const providers = engine.providerRouter.listProviders(category);

    const detailedProviders = await Promise.all(
      providers.map(async p => {
        const health = await engine.healthManager.checkHealth(p);
        const caps = await p.capabilities();
        const usage = engine.quotaManager.getUsage(p.id);
        const limit = engine.quotaManager.getLimit(p.id);
        const isDefault = engine.providerRouter.getDefaultProviderId(p.category) === p.id;

        return {
          id: p.id,
          name: p.name,
          version: p.version,
          category: p.category,
          isDefault,
          health,
          capabilities: caps,
          quota: { usage, limit },
        };
      })
    );

    return NextResponse.json({ success: true, count: detailedProviders.length, providers: detailedProviders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, category, providerId } = body;
    const engine = CapabilityEcosystemEngine.getInstance();

    if (action === 'set_default') {
      const ok = engine.providerRouter.setDefaultProvider(category, providerId);
      return NextResponse.json({ success: ok, category, defaultProviderId: providerId });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
