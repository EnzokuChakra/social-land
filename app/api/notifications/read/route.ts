import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!db) {
      return new NextResponse("Database connection not available", { status: 500 });
    }

    const body = await request.json();
    const { id } = body;
    if (!id) {
      return new NextResponse("Notification ID is required", { status: 400 });
    }

    await db.notification.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        isRead: true,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[MARK_NOTIFICATION_READ]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 