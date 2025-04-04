import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/uploadFile";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.verified) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const photo = formData.get("photo") as File;

    if (!photo) {
      return new NextResponse("Event photo is required", { status: 400 });
    }

    // Upload photo to storage
    let photoUrl;
    try {
      photoUrl = await uploadFile(photo);
    } catch (error) {
      console.error("[EVENTS_POST_UPLOAD]", error);
      return new NextResponse(
        error instanceof Error ? error.message : "Failed to upload photo",
        { status: 500 }
      );
    }

    // Create event in database
    try {
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