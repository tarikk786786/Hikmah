import { NextRequest, NextResponse } from 'next/server';
import { BrowserOrchestrator } from '@/browser/core/orchestrator';

const orchestrator = BrowserOrchestrator.getInstance();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, type, params } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: 'action type is required' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'click':
        result = await orchestrator.click(sessionId, params?.selector, {
          enableSelfHealing: params?.enableSelfHealing ?? true,
          targetText: params?.targetText,
          targetRole: params?.targetRole,
          targetAriaLabel: params?.targetAriaLabel,
          timeoutMs: params?.timeoutMs,
        });
        break;

      case 'type':
        result = await orchestrator.type(sessionId, params?.selector, params?.text || '', {
          clearFirst: params?.clearFirst,
          delayMs: params?.delayMs,
        });
        break;

      case 'fill_form':
        result = await orchestrator.fillForm(sessionId, params?.fields || {});
        break;

      case 'select':
        result = await orchestrator.select(sessionId, params?.selector, params?.value || '');
        break;

      case 'scroll':
        result = await orchestrator.scroll(sessionId, {
          deltaX: params?.deltaX,
          deltaY: params?.deltaY,
          selector: params?.selector,
        });
        break;

      case 'wait':
        result = await orchestrator.waitFor(sessionId, params?.selectorOrTimeout || 1000, {
          timeoutMs: params?.timeoutMs,
        });
        break;

      case 'act_semantic':
        result = await orchestrator.actSemantic(sessionId, {
          instruction: params?.instruction || '',
          variables: params?.variables,
        });
        break;

      default:
        return NextResponse.json({ error: `Unsupported action type [${type}]` }, { status: 400 });
    }

    const session = orchestrator.getSession(sessionId);

    return NextResponse.json({
      success: result.success,
      result,
      session,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
