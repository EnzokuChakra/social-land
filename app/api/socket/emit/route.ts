import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (!event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    // Convert WebSocket URL to HTTP URL for REST API calls
    const wsUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:5002';
    const socketUrl = wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
    
    console.log(`[Socket API] Emitting ${event} to socket server at ${socketUrl}`);

    // Send event to socket server via HTTP
    try {
      await axios.post(`${socketUrl}/emit`, {
        event,
        data: event === 'storyDeleted' ? {
          storyId: data.storyId,
          userId: data.userId,
          remainingStoriesCount: data.remainingStoriesCount || 0,
          timestamp: new Date().toISOString()
        } : event === 'storyCreated' ? {
          storyId: data.storyId,
          userId: data.userId,
          username: data.username,
          timestamp: data.timestamp || new Date().toISOString()
        } : data
      });

      console.log(`[SOCKET_EMIT] Successfully emitted '${event}'`);
      return NextResponse.json({ success: true });
    } catch (socketError) {
      console.error('[SOCKET_EMIT] Error sending event to socket server:', socketError);
      // Return success to prevent breaking core functionality
      return NextResponse.json({ 
        success: true, 
        warning: 'Socket event emission failed, but operation completed'
      });
    }
  } catch (error) {
    console.error('Error parsing socket request:', error);
    return NextResponse.json({ 
      success: true, 
      warning: 'Socket event emission failed, but operation completed'
    });
  }
} 