import { NextRequest, NextResponse } from 'next/server';
import { CapabilityRegistry } from '@/core/capabilities/registry';

const registry = CapabilityRegistry.getInstance();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as any;
  const category = searchParams.get('category') as any;
  const healthyOnly = searchParams.get('healthyOnly') === 'true';

  let list = registry.list();
  if (type) list = list.filter(c => c.type === type);
  if (category) list = list.filter(c => c.category === category);
  if (healthyOnly) list = list.filter(c => c.health_status === 'HEALTHY');

  return NextResponse.json({
    total: list.length,
    capabilities: list
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, enabled, health_status } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (enabled !== undefined) {
      registry.setEnabled(id, Boolean(enabled));
    }
    if (health_status) {
      registry.updateHealth(id, health_status);
    }

    const updated = registry.get(id);
    return NextResponse.json({ success: true, capability: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
