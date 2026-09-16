import { NextResponse } from 'next/server';
import { CapabilityEcosystemEngine } from '../../../../../capability-ecosystem/ecosystem-engine.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyInstalled = searchParams.get('onlyInstalled') === 'true';
    const engine = CapabilityEcosystemEngine.getInstance();
    const plugins = engine.pluginRegistry.listPlugins(onlyInstalled);

    return NextResponse.json({ success: true, count: plugins.length, plugins });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, pluginId } = body;
    const engine = CapabilityEcosystemEngine.getInstance();

    if (action === 'install') {
      const res = await engine.installer.install(pluginId);
      return NextResponse.json(res, { status: res.success ? 200 : 400 });
    }

    if (action === 'uninstall') {
      const ok = engine.installer.uninstall(pluginId);
      return NextResponse.json({ success: ok, pluginId });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
