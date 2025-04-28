import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSocket } from "@/lib/socket";
import { NotificationWithExtras } from "@/lib/definitions";

// API route to fetch notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!db) {
      throw new Error("Database connection not available");
    }

    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            image: true,
            isPrivate: true,
            followers: {
              where: {
                followerId: session.user.id,
              },
              select: {
                status: true,
              },
            },
            following: {
              where: {
                followingId: session.user.id,
              },
              select: {
                status: true,
              },
            },
          },
        },
        post: {
          select: {
            id: true,
            fileUrl: true,
          },
        },
        story: {
          select: {
            id: true,
            fileUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform notifications to include follow state
    const transformedNotifications = notifications.map(notification => ({
      ...notification,
      sender: notification.sender ? {
        ...notification.sender,
        isFollowing: notification.sender.following.length > 0 && notification.sender.following[0].status === "ACCEPTED",
        isFollowedByUser: notification.sender.followers.length > 0 && notification.sender.followers[0].status === "ACCEPTED",
      } : undefined
    }));

    return NextResponse.json({ notifications: transformedNotifications });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!db) {
      throw new Error("Database connection not available");
    }

    const body = await request.json();
    const { type, userId, postId, metadata } = body;

    // Create notification in database
    const notification = await db.notification.create({
      data: {
        id: crypto.randomUUID(),
        type,
        userId,
        sender_id: session.user.id,
        postId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            image: true,
            isPrivate: true,
            followers: {
              where: {
                followerId: userId,
              },
              select: {
                status: true,
              },
            },
            following: {
              where: {
                followingId: userId,
              },
              select: {
                status: true,
              },
            },
          },
        },
        post: {
          select: {
            id: true,
            fileUrl: true,
          },
        },
      },
    });

    // Transform notification to include follow state
    const transformedNotification = {
      ...notification,
      sender: notification.sender ? {
        ...notification.sender,
        isFollowing: notification.sender.following.length > 0 && notification.sender.following[0].status === "ACCEPTED",
        isFollowedByUser: notification.sender.followers.length > 0 && notification.sender.followers[0].status === "ACCEPTED",
      } : undefined
    };

    // Emit socket event for real-time notification
    const socket = getSocket();
    if (socket) {
      socket.emit("notification", transformedNotification);
    }

    return NextResponse.json(transformedNotification);
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 