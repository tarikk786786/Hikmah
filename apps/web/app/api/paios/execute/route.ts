import { NextRequest, NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, sessionId, projectId, targetDeviceId } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ success: false, error: 'Command string is required.' }, { status: 400 });
    }

    const kernel = PAIOSKernel.getInstance();
    const result = await kernel.executeCommand(command, { sessionId, projectId, targetDeviceId });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Execution error' }, { status: 500 });
  }
}
