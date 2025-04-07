import { NextRequest, NextResponse } from 'next/server';
import { getNotifications } from '@/lib/actions';
import { getToken } from 'next-auth/jwt';

// API route to fetch notifications
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }
    
    // Get notifications using the server action
    const { notifications, followRequests } = await getNotifications();
    
    // Return the notifications
    return NextResponse.json({ notifications, followRequests });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
} 