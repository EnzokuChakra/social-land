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

    // Update all unread notifications for the user
    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
        type: {
          in: ["FOLLOW", "LIKE", "COMMENT", "REPLY", "MENTION", "TAG", "STORY_LIKE", "COMMENT_LIKE", "EVENT_CREATED", "FOLLOW_REQUEST"]
        }
      },
      data: {
        isRead: true,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[MARK_NOTIFICATIONS_READ]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 