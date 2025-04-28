import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    if (!db) {
      return new NextResponse("Database not initialized", { status: 500 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log(`[MARK-READ] Marking notifications as read for user: ${session.user.id}`);

    // First, let's check what notifications exist for this user
    const existingNotifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        isRead: true,
      }
    });
    console.log(`[MARK-READ] Existing notifications before update:`, existingNotifications);

    // Update all unread notifications for the user
    const result = await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    console.log(`[MARK-READ] Update result:`, result);

    // Verify the update
    const updatedNotifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        isRead: true,
      }
    });
    console.log(`[MARK-READ] Notifications after update:`, updatedNotifications);

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[MARK_NOTIFICATIONS_READ]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 