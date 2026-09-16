import { NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function GET() {
  try {
    const kernel = PAIOSKernel.getInstance();
    if (!kernel.getStatus().isBooted) {
      await kernel.boot();
    }
    const status = kernel.getStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch PAIOS status' }, { status: 500 });
  }
}
