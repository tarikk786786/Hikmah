import { NextRequest } from 'next/server';
import { AISystemBus } from '@/paio/events/ai-system-bus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const bus = AISystemBus.getInstance();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue("data: " + JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }) + "\n\n");

      const unsubscribe = bus.subscribe((event) => {
        try {
          controller.enqueue("data: " + JSON.stringify(event) + "\n\n");
        } catch (err) {
          console.error('[SSE Error]', err);
        }
      });

      req.signal.addEventListener('abort', () => {
        unsubscribe();
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
