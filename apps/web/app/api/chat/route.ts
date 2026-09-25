import { NextRequest, NextResponse } from 'next/server';
import { PAIOSKernel } from '@/paio/kernel/paios-kernel';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, sessionId, projectId, stream = true } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const kernel = PAIOSKernel.getInstance();

    if (!stream) {
      const response = await kernel.executeCommand(query, {
        sessionId,
        projectId
      });
      return NextResponse.json(response);
    }

    // Streaming response using Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send thinking phase
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: "*Analyzing intent via PAIOSKernel...*\n" })}\n\n`));
          
          const result = await kernel.executeCommand(query, { sessionId, projectId });
          
          // Stream output
          const parts = result.output.split(' ');
          for (const word of parts) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`));
            await new Promise(r => setTimeout(r, 20)); // Simulate typing
          }
          
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (err: unknown) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
