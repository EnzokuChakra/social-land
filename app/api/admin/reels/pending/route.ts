import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
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

    const pendingReels = await db.reel.findMany({
      where: {
        status: "PENDING"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        caption: true,
        fileUrl: true,
        thumbnail: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true
          }
        }
      }
    });

    return NextResponse.json(pendingReels);
  } catch (error) {
    console.error("Error fetching pending reels:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 