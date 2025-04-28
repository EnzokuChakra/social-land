import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { io } from 'socket.io-client';

// Initialize socket connection
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
  transports: ['websocket'],
  autoConnect: true,
  forceNew: false,
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 2000
});

// Get maintenance mode status
export async function GET(request: Request) {
  try {
    const isPublicRequest = request.headers.get('x-public-request') === 'true';
    
    // For public requests, just return the maintenance status
    if (isPublicRequest) {
      const maintenanceMode = await db?.setting.findUnique({
        where: { key: "maintenanceMode" }
      });

      const maintenanceMessage = await db?.setting.findUnique({
        where: { key: "maintenanceMessage" }
      });

      return NextResponse.json({
        maintenanceMode: maintenanceMode?.value === "true",
        message: maintenanceMessage?.value || "We're making some improvements to bring you a better experience. We'll be back shortly!"
      });
    }

    // For authenticated requests, check if user is authorized
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ 
        maintenanceMode: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Return maintenance status for authenticated users
    const maintenanceMode = await db?.setting.findUnique({
      where: { key: "maintenanceMode" }
    });

    const maintenanceMessage = await db?.setting.findUnique({
      where: { key: "maintenanceMessage" }
    });

    return NextResponse.json({
      maintenanceMode: maintenanceMode?.value === "true",
      message: maintenanceMessage?.value || "We're making some improvements to bring you a better experience. We'll be back shortly!"
    });
  } catch (error) {
    console.error('[MAINTENANCE API] Error:', error);
    return NextResponse.json({ 
      maintenanceMode: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}

// Update maintenance mode
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'MASTER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { maintenanceMode, message } = body;

    // Update maintenance mode setting
    await db?.setting.upsert({
      where: { key: "maintenanceMode" },
      update: { value: maintenanceMode.toString() },
      create: {
        id: `maintenanceMode_${Date.now()}`,
        key: "maintenanceMode",
        value: maintenanceMode.toString(),
        updatedAt: new Date()
      }
    });

    // Update maintenance message if provided
    if (message) {
      await db?.setting.upsert({
        where: { key: "maintenanceMessage" },
        update: { value: message },
        create: {
          id: `maintenanceMessage_${Date.now()}`,
          key: "maintenanceMessage",
          value: message,
          updatedAt: new Date()
        }
      });
    }

    // Broadcast maintenance mode change to all connected clients
    if (socket.connected) {
      socket.emit("maintenanceStatus", {
        maintenanceMode,
        message: message || "We're making some improvements to bring you a better experience. We'll be back shortly!"
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MAINTENANCE API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 