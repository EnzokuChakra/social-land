import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/uploadFile";
import { nanoid } from "nanoid";
import { deleteUploadedFile } from "@/lib/server-utils";
import { Fields, Files, File as FormidableFile, formidable } from 'formidable';
import { mkdir } from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.verified) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'events');
    await mkdir(uploadDir, { recursive: true });

    const form = formidable({
      uploadDir,
      filename: (name: string, ext: string) => `${nanoid()}${ext}`,
      maxFileSize: 4 * 1024 * 1024, // 4MB
    });

    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    if (!files.photo) {
      return new NextResponse("Event photo is required", { status: 400 });
    }

    const photo = Array.isArray(files.photo) ? files.photo[0] : files.photo;
    const photoUrl = `/uploads/events/${path.basename(photo.filepath)}`;

    // Create event in database
    try {
      const prizes = fields.prizes ? JSON.parse(fields.prizes.toString()) : [];
      const event = await db.event.create({
        data: {
          id: nanoid(),
          name: fields.name?.toString() || '',
          type: fields.type?.toString() || '',
          description: fields.description?.toString() || '',
          rules: fields.rules?.toString(),
          prize: prizes.length > 0 ? prizes[0] : null,
          location: fields.location?.toString() || '',
          startDate: new Date(fields.startDate?.toString() || ''),
          photoUrl,
          user_id: session.user.id,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(event);
    } catch (error) {
      console.error("[EVENTS_POST_DB]", error);
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");

    if (!eventId) {
      return new NextResponse("Event ID is required", { status: 400 });
    }

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

    // Delete the event
    await db.event.delete({
      where: { id: eventId },
    });

    // Delete the event photo
    if (event.photoUrl) {
      await deleteUploadedFile(event.photoUrl);
    }

    return new NextResponse("Event deleted successfully", { status: 200 });
  } catch (error) {
    console.error("[EVENTS_DELETE]", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
} 