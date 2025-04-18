import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/definitions";
import { PrismaClient } from "@prisma/client";
import { io } from 'socket.io-client';

// Type declaration for the PrismaClient to include the Setting model
declare global {
  namespace PrismaClient {
    interface PrismaClient {
      setting: {
        findUnique: (args: { where: { key: string } }) => Promise<{ value: string } | null>;
        upsert: (args: {
          where: { key: string };
          update: { value: string; updatedAt: Date };
          create: { id: string; key: string; value: string; updatedAt: Date };
        }) => Promise<{ value: string }>;
      };
    }
  }
}

// Initialize socket connection
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
  transports: ['websocket']
});

// Get maintenance mode status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow middleware to check maintenance status without requiring full authentication
    const isMiddlewareRequest = request.headers.get('user-agent')?.includes('Next.js Middleware');
    
    if (!session && !isMiddlewareRequest) {
      return NextResponse.json({ 
        maintenanceMode: false,
        error: 'Unauthorized'
      }, { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    const maintenanceMode = await db.setting.findUnique({
      where: { key: "maintenanceMode" }
    });

    const maintenanceMessage = await db.setting.findUnique({
      where: { key: "maintenanceMessage" }
    });

    return NextResponse.json({
      maintenanceMode: maintenanceMode?.value === "true",
      estimatedTime: "2:00",
      message: maintenanceMessage?.value || "We're making some improvements to bring you a better experience. We'll be back shortly!"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('[MAINTENANCE API] Error:', error);
    return NextResponse.json({ 
      maintenanceMode: false,
      error: 'Internal Server Error'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}

// Update maintenance mode
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'MASTER_ADMIN') {
      console.error('[MAINTENANCE API] Unauthorized access:', {
        hasSession: !!session,
        userRole: session?.user?.role
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { maintenanceMode, message } = body;

    console.log('[MAINTENANCE API] Received request:', {
      maintenanceMode,
      message,
      userId: session.user.id,
      timestamp: new Date().toISOString()
    });

    // First try to find existing setting
    const existingSetting = await db.setting.findUnique({
      where: { key: "maintenanceMode" }
    });

    console.log('[MAINTENANCE API] Existing setting:', existingSetting);

    if (existingSetting) {
      // Update existing setting
      await db.setting.update({
        where: { key: "maintenanceMode" },
        data: { value: maintenanceMode.toString() }
      });
    } else {
      // Create new setting
      await db.setting.create({
        data: {
          id: `maintenanceMode_${Date.now()}`,
          key: "maintenanceMode",
          value: maintenanceMode.toString(),
          updatedAt: new Date()
        }
      });
    }

    // Save maintenance message if provided
    if (message) {
      await db.setting.upsert({
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

    // Emit maintenance mode change to all connected clients
    try {
      socket.emit("maintenanceMode", {
        maintenanceMode,
        estimatedTime: "2:00",
        message: message || "We're making some improvements to bring you a better experience. We'll be back shortly!"
      });
    } catch (socketError) {
      console.error('[MAINTENANCE API] Socket error:', socketError);
      // Continue execution even if socket fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MAINTENANCE API] Error:', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Update maintenance mode (PUT handler)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'MASTER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { maintenanceMode, message } = body;

    // First try to find existing setting
    const existingSetting = await db.setting.findUnique({
      where: { key: "maintenanceMode" }
    });

    if (existingSetting) {
      // Update existing setting
      await db.setting.update({
        where: { key: "maintenanceMode" },
        data: { value: maintenanceMode.toString() }
      });
    } else {
      // Create new setting
      await db.setting.create({
        data: {
          id: `maintenanceMode_${Date.now()}`,
          key: "maintenanceMode",
          value: maintenanceMode.toString(),
          updatedAt: new Date()
        }
      });
    }

    // Save maintenance message if provided
    if (message) {
      await db.setting.upsert({
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

    // Emit maintenance mode change to all connected clients
    socket.emit("maintenanceMode", {
      maintenanceMode,
      estimatedTime: "2:00",
      message: message || "We're making some improvements to bring you a better experience. We'll be back shortly!"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MAINTENANCE API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 