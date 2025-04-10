import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { unlink } from 'fs/promises';
import { getSocket } from "@/lib/socket";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
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
    
    // Use the correct absolute path for OG-GRAM
    const uploadDir = path.join('/var/www/OG-GRAM/public/uploads/events');
    const filepath = path.join(uploadDir, filename);
    
    console.log("[EVENTS_POST] Saving photo:", { 
      filename,
      filepath,
      uploadDir,
      photoName: photo.name,
      photoSize: photo.size,
      photoType: photo.type
    });

    try {
      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true });
      
      // Convert file to buffer and save
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      console.log("[EVENTS_POST] Writing file...");
      await writeFile(filepath, buffer);
      console.log("[EVENTS_POST] File written successfully");
      
      // Verify file exists
      const fs = require('fs').promises;
      const stats = await fs.stat(filepath);
      console.log("[EVENTS_POST] File stats:", {
        size: stats.size,
        path: filepath,
        exists: true
      });
    } catch (error) {
      console.error("[EVENTS_POST] Error saving file:", error);
      throw error;
    }

    const photoUrl = `/uploads/events/${filename}`;
    console.log("[EVENTS_POST] Photo URL:", photoUrl);

    // Create event in database
    try {
      console.log("[EVENTS_POST] Creating event in database...");
      const prizes = formData.get("prizes") ? JSON.parse(formData.get("prizes") as string) : [];
      const event = await db.event.create({
        data: {
          id: nanoid(),
          name: formData.get("name") as string,
          type: formData.get("type") as string,
          description: formData.get("description") as string,
          rules: formData.get("rules") as string,
          prize: prizes.length > 0 ? prizes[0] : null,
          location: formData.get("location") as string,
          startDate: new Date(formData.get("startDate") as string),
          photoUrl,
          user_id: session.user.id,
          updatedAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      console.log("[EVENTS_POST] Event created successfully:", { 
        eventId: event.id,
        eventName: event.name,
        eventType: event.type,
        eventStartDate: event.startDate,
        userId: event.user_id
      });
      
      // Get all users except the event creator
      const users = await db.user.findMany({
        where: {
          id: {
            not: session.user.id
          }
        },
        select: {
          id: true
        }
      });

      console.log("[EVENTS_POST] Creating notifications for users:", {
        totalUsers: users.length,
        eventId: event.id
      });

      // Create notifications for all users
      await Promise.all(users.map((user: { id: string }) => 
        db.notification.create({
          data: {
            id: nanoid(),
            type: "EVENT_CREATED",
            userId: user.id,
            sender_id: session.user.id,
            metadata: JSON.stringify({
              eventId: event.id,
              eventName: event.name
            }),
          },
        })
      ));
      
      console.log("[EVENTS_POST] Notifications created successfully");
      
      // Emit socket event for real-time update
      console.log("[EVENTS_POST] Emitting socket event 'newEvent'");
      getSocket().emit("newEvent", event);
      console.log("[EVENTS_POST] Socket event emitted");
      
      return NextResponse.json(event);
    } catch (error) {
      console.error("[EVENTS_POST_DB]", error);
      // Try to clean up the uploaded file if database operation fails
      try {
        const fs = require('fs').promises;
        await fs.unlink(filepath);
      } catch (unlinkError) {
        console.error("[EVENTS_POST] Failed to clean up file:", unlinkError);
      }
      return new NextResponse(
        error instanceof Error ? error.message : "Failed to create event in database",
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[EVENTS_POST]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const location = searchParams.get("location");

    const where = {
      ...(type && type !== "All Types" && { type }),
      ...(location && { location }),
    };

    const events = await db.event.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("[EVENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
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

    console.log("[EVENTS_DELETE] Deleting event from database:", eventId);
    // Delete the event
    await db.event.delete({
      where: { id: eventId },
    });

    // Delete the event photo
    if (event.photoUrl) {
      try {
        const filename = event.photoUrl.split('/').pop();
        const filepath = path.join('/var/www/OG-GRAM/public/uploads/events', filename || '');
        console.log("[EVENTS_DELETE] Deleting photo file:", filepath);
        
        await unlink(filepath);
        console.log("[EVENTS_DELETE] Photo file deleted successfully");
      } catch (error) {
        console.error("[EVENTS_DELETE] Error deleting photo file:", error);
        // Don't throw here - the event is already deleted from DB
      }
    }

    // Emit socket event for real-time update
    getSocket().emit("deleteEvent", eventId);

    console.log("[EVENTS_DELETE] Event deleted successfully:", eventId);
    return new NextResponse(JSON.stringify({ success: true }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("[EVENTS_DELETE]", error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal Server Error",
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