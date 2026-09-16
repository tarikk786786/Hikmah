import { NextRequest, NextResponse } from 'next/server';
import { JarvisCore } from '@/core/assistant/jarvis-core';

// Singleton JarvisCore instance across requests
const jarvis = new JarvisCore();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId, conversationId, projectId, role, approvalToken, stream = true } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!stream) {
      const response = await jarvis.process({
        query,
        userId,
        conversationId,
        projectId,
        role,
        approvalToken
      });
      return NextResponse.json(response);
    }

    // Streaming response using Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    const streamIterable = jarvis.stream({
      query,
      userId,
      conversationId,
      projectId,
      role,
      approvalToken
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamIterable) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.content })}\n\n`));
            }
            if (chunk.done) {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            }
          }
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
