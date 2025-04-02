import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { reelId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is an admin or moderator
    const userRole = session.user.role || "USER";
    if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { status, note } = await request.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update the reel status
    const updatedReel = await db.reel.update({
      where: {
        id: params.reelId,
      },
      data: {
        status,
        reviewNote: note || null,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json(updatedReel);
  } catch (error) {
    console.error("Error reviewing reel:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 