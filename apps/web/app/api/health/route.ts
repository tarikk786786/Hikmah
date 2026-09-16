import { NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function GET() {
  try {
    const kernel = PAIOSKernel.getInstance();
    if (!kernel.getStatus().isBooted) {
      await kernel.boot();
    }
    const status = kernel.getStatus();

    return NextResponse.json({
      status: 'ok',
      service: 'hikmah',
      version: status.version,
      timestamp: new Date().toISOString(),
      uptimeSeconds: status.uptimeSeconds,
      privacyMode: status.privacyMode,
      subsystems: {
        healthy: status.health.healthyCount,
        total: status.health.totalCount,
        overall: status.health.overallStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      service: 'hikmah',
      message: error?.message || 'Health check error',
    }, { status: 500 });
  }
}
