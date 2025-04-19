import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    if (!db) {
      return new NextResponse("Database connection not available", { status: 500 });
    }

    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { fileUrl, caption } = await req.json();

    if (!fileUrl) {
      return new NextResponse("File URL is required", { status: 400 });
    }

    // Create the reel with PENDING status
    const reel = await db.reel.create({
      data: {
        id: uuidv4(),
        fileUrl,
        caption: caption || null,
        thumbnail: fileUrl,
        user_id: session.user.id,
        status: "PENDING",
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(reel);
  } catch (error) {
    console.error("[REEL_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 