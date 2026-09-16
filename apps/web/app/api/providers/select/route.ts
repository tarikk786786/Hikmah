import { NextResponse } from 'next/server';
import { CapabilityEcosystemEngine } from '../../../../../../capability-ecosystem/ecosystem-engine.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, explicitProviderId, userPreferredProviderId } = body;

    if (!operation) {
      return NextResponse.json({ success: false, error: 'Operation is required' }, { status: 400 });
    }

    const engine = CapabilityEcosystemEngine.getInstance();
    const { provider, explanation } = await engine.providerRouter.selectProvider(operation, {
      explicitProviderId,
      userPreferredProviderId,
      allowFailover: true,
    });

    return NextResponse.json({
      success: true,
      selectedProvider: {
        id: provider.id,
        name: provider.name,
        category: provider.category,
      },
      explanation,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
