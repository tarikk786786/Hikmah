import { NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function GET() {
  try {
    const kernel = PAIOSKernel.getInstance();
    if (!kernel.getStatus().isBooted) {
      await kernel.boot();
    }
    const status = kernel.getStatus();

    if (status.health.unhealthyCount > 0) {
      return NextResponse.json({
        status: 'degraded',
        service: 'hikmah',
        ready: false,
        message: `${status.health.unhealthyCount} subsystems unhealthy`,
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'ok',
      service: 'hikmah',
      ready: true,
      subsystems: {
        healthy: status.health.healthyCount,
        total: status.health.totalCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      service: 'hikmah',
      ready: false,
      message: error?.message || 'Readiness evaluation failed',
    }, { status: 503 });
  }
}
