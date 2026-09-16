import { NextRequest, NextResponse } from 'next/server';
import { ToolRegistry } from '@/tools/registry/registry';
import { AuditLogger } from '@/security/audit/logger';

const toolRegistry = new ToolRegistry();

export async function GET() {
  const tools = toolRegistry.listTools().map(t => ({
    name: t.name,
    version: t.version,
    description: t.description,
    risk: t.risk,
    enabled: t.enabled,
    timeoutMs: t.timeoutMs,
    inputSchema: t.inputSchema
  }));

  return NextResponse.json({ tools });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, input = {}, userId = 'usr_default', approvalToken } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });
    }

    const correlation = AuditLogger.createCorrelation({ userId });
    const result = await toolRegistry.executeTool(name, input, {
      userId,
      correlation,
      approvalToken
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
