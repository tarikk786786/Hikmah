import { NextResponse } from 'next/server';
import { CapabilityEcosystemEngine } from '../../../../../../capability-ecosystem/ecosystem-engine.js';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const engine = CapabilityEcosystemEngine.getInstance();
    const plugin = engine.pluginRegistry.getPlugin(id);

    if (!plugin) {
      return NextResponse.json({ success: false, error: `Plugin '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, plugin });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const engine = CapabilityEcosystemEngine.getInstance();

    if (body.enabled !== undefined) {
      const ok = engine.pluginRegistry.enablePlugin(id, Boolean(body.enabled));
      return NextResponse.json({ success: ok, pluginId: id, enabled: body.enabled });
    }

    return NextResponse.json({ success: false, error: 'Invalid update operation' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
