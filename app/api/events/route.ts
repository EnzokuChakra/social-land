import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { unlink } from 'fs/promises';
import { getServerSocket } from "@/lib/socket";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";

// Ensure db is available
if (!db) {
  throw new Error("Database connection not available");
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  if (!db) {
    return NextResponse.json(
      { error: "Database connection not available" },
      { status: 500 }
    );
  }

  try {
    console.log("[EVENTS_POST] Starting event creation...");
    const session = await getServerSession(authOptions);
    console.log("[EVENTS_POST] Session:", { userId: session?.user?.id, verified: session?.user?.verified });

    if (!session?.user || !session.user.verified) {
      console.log("[EVENTS_POST] Unauthorized: No session or user not verified");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get form data
    const formData = await req.formData();
    console.log("[EVENTS_POST] Form data received:", {
      name: formData.get("name"),
      type: formData.get("type"),
      location: formData.get("location"),
      startDate: formData.get("startDate"),
      hasRules: !!formData.get("rules"),
      hasPrizes: !!formData.get("prizes"),
      hasPhoto: !!formData.get("photo")
    });

    // Handle photo upload
    const photo = formData.get("photo");
    if (!photo || typeof photo === 'string') {
      console.error("[EVENTS_POST] No photo found in request or invalid photo");
      return new NextResponse("Event photo is required", { status: 400 });
    }

    // Create a unique filename
    const ext = path.extname(photo.name);
    const filename = `${nanoid()}${ext}`;
    
    // Use correct path based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const uploadDir = isProduction 
      ? '/var/www/social-land/public/uploads/events'
      : path.join(process.cwd(), 'public', 'uploads', 'events');
    const relativePath = `/uploads/events/${filename}`;
    const fullPath = path.join(uploadDir, filename);
    
    console.log("[EVENTS_POST] Saving photo:", { 
      filename,
      filepath: relativePath,
      uploadDir,
      photoName: photo.name,
      size: photo.size
    });

    // Create directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
      console.log("[EVENTS_POST] Directory created/verified:", uploadDir);
    } catch (mkdirError) {
      console.error("[EVENTS_POST] Failed to create directory:", mkdirError);
      return NextResponse.json(
        { error: "Failed to create upload directory" },
        { status: 500 }
      );
    }

    // Convert file to buffer and save
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write file
    try {
      console.log("[EVENTS_POST] Writing file...");
      await writeFile(fullPath, buffer);
      console.log("[EVENTS_POST] File written successfully");
      
      // Create event in database
      const event = await prisma.event.create({
        data: {
          name: formData.get("name") as string,
          type: formData.get("type") as string,
          location: formData.get("location") as string,
          startDate: new Date(formData.get("startDate") as string),
          rules: formData.get("rules") as string,
          prizes: formData.get("prizes") as string,
          photo: relativePath,
          userId: session.user.id
        }
      });

      // Emit socket event using server-side socket
      const socket = getServerSocket();
      if (socket) {
        socket.emit('newEvent', event);
      }

      return NextResponse.json(event);
    } catch (writeError) {
      console.error("[EVENTS_POST] Failed to write file:", writeError);
      return NextResponse.json(
        { error: "Failed to save event photo" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[EVENTS_POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!prisma) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const prismaClient = prisma as PrismaClient;

    const events = await prismaClient.event.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verified: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            interested: true,
            participants: true,
          },
        },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[EVENTS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!db) {
    return new NextResponse(
      JSON.stringify({ error: "Database connection not available", success: false }), 
      { status: 500 }
    );
  }

  try {
    console.log("[EVENTS_DELETE] Starting event deletion...");
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return new NextResponse("Event ID is required", { status: 400 });
    }

    console.log("[EVENTS_DELETE] Fetching event:", eventId);
    // Get the event to check ownership and permissions
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        user_id: true,
        photoUrl: true,
      },
    });

    if (!event) {
      return new NextResponse("Event not found", { status: 404 });
    }

    // Check if user is authorized to delete
    const isAuthorized = 
      session.user.id === event.user_id || 
      session.user.role === "ADMIN" || 
      session.user.role === "MASTER_ADMIN";

    if (!isAuthorized) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // First delete the event photo if it exists
    if (event.photoUrl) {
      try {
        const filename = event.photoUrl.split('/').pop();
        if (filename) {
          const filepath = path.join(process.cwd(), 'public', 'uploads', 'events', filename);
          console.log("[EVENTS_DELETE] Deleting photo file:", filepath);
          
          await unlink(filepath);
          console.log("[EVENTS_DELETE] Photo file deleted successfully");
        }
      } catch (error) {
        console.error("[EVENTS_DELETE] Error deleting photo file:", error);
        // Continue with event deletion even if photo deletion fails
      }
    }

    console.log("[EVENTS_DELETE] Deleting event from database:", eventId);
    // Delete the event
    await db.event.delete({
      where: { id: eventId },
    });

    // Emit socket event for real-time update
    const socket = getServerSocket();
    if (socket) {
      socket.emit("deleteEvent", eventId);
    }

    console.log("[EVENTS_DELETE] Event deleted successfully:", eventId);
    return new NextResponse(JSON.stringify({ success: true }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("[EVENTS_DELETE] Error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to delete event",
        success: false 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 