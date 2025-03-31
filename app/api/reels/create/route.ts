import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { fileUrl, caption } = await req.json();

    if (!fileUrl) {
      return new NextResponse("File URL is required", { status: 400 });
    }

    // Create the reel with PENDING status
    const reel = await prisma.reel.create({
      data: {
        fileUrl,
        caption,
        thumbnail: fileUrl, // Using the video URL as thumbnail for now
        user_id: session.user.id,
        status: "PENDING", // Set initial status as PENDING
      },
    });

    return NextResponse.json(reel);
  } catch (error) {
    console.error("[REEL_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 