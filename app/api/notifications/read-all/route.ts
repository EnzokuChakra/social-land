import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!db) {
      return new NextResponse("Database connection not available", { status: 500 });
    }

    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[MARK_ALL_NOTIFICATIONS_READ]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 