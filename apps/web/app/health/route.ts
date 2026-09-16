import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'hikmah',
    version: '1.0.0-paios.step25',
    timestamp: new Date().toISOString(),
  });
}
