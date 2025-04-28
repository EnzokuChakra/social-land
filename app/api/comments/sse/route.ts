import { headers } from "next/headers";
import { NextResponse } from "next/server";

const commentEventClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();

export function addCommentEvent(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = encoder.encode(message);
  commentEventClients.forEach((client) => client.enqueue(encodedMessage));
}

export async function GET() {
  const headersList = headers();

  const stream = new ReadableStream({
    start(controller) {
      commentEventClients.add(controller);

      // Send initial connection message
      controller.enqueue(encoder.encode("event: connected\ndata: connected\n\n"));
    },
    cancel(controller) {
      commentEventClients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const comment = await request.json();
  addCommentEvent(comment);
  return NextResponse.json({ success: true });
} 