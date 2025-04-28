import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { FollowUser } from "@/lib/schemas";

const followCooldowns = new Map<string, number>();
const FOLLOW_COOLDOWN_MS = 5000; // 5 seconds cooldown

export async function POST(req: Request) {
  try {
    if (!prisma) {
      console.error("[FOLLOW_API] Prisma client not initialized");
      return new NextResponse(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error("[FOLLOW_API] Unauthorized request - no session");
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = FollowUser.parse(body);
    const { followingId, followerId, action } = validatedData;

    // Add rate limiting for follow action
    if (action === "follow") {
      const cooldownKey = `${session.user.id}-${followingId}`;
      const lastFollowTime = followCooldowns.get(cooldownKey);
      const now = Date.now();

      if (lastFollowTime && now - lastFollowTime < FOLLOW_COOLDOWN_MS) {
        return new NextResponse(
          JSON.stringify({ 
            error: "Please wait a few seconds before following again",
            status: "UNFOLLOWED" 
          }),
          { status: 429 }
        );
      }

      followCooldowns.set(cooldownKey, now);
    }

    // For delete/accept actions, we need followerId
    if ((action === "delete" || action === "accept") && !followerId) {
      return new NextResponse(
        JSON.stringify({ error: "Missing followerId" }),
        { status: 400 }
      );
    }

    // For follow/unfollow actions, we need followingId
    if ((action === "follow" || action === "unfollow") && !followingId) {
      return new NextResponse(
        JSON.stringify({ error: "Missing followingId" }),
        { status: 400 }
      );
    }

    // Check if there's an existing follow relationship
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: followingId!
        }
      }
    });

    if (action === "unfollow") {
      console.log("[FOLLOW_API] Processing unfollow request:", {
        followerId: session.user.id,
        followingId: followingId
      });

      if (!existingFollow) {
        console.log("[FOLLOW_API] Follow relationship not found for unfollow");
        return new NextResponse(
          JSON.stringify({ error: "Follow relationship not found" }),
          { status: 404 }
        );
      }

      console.log("[FOLLOW_API] Deleting follow relationship");
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: followingId!
          }
        }
      });

      console.log("[FOLLOW_API] Deleting follow-related notifications");
      // Delete ALL follow-related notifications between these users
      await prisma.notification.deleteMany({
        where: {
          type: {
            in: ["FOLLOW", "FOLLOW_REQUEST"]
          },
          AND: [
            {
              OR: [
                { sender_id: session.user.id },
                { sender_id: followingId }
              ]
            },
            {
              OR: [
                { userId: session.user.id },
                { userId: followingId }
              ]
            }
          ]
        },
      });

      console.log("[FOLLOW_API] Unfollow completed successfully");
      return new NextResponse(
        JSON.stringify({ 
          status: "DELETED",
          message: "Successfully unfollowed"
        }), 
        { status: 200 }
      );
    }

    // Handle follow action
    if (existingFollow) {
      return new NextResponse(
        JSON.stringify({ 
          error: "Already following or requested",
          status: existingFollow.status
        }), 
        { status: 400 }
      );
    }

    // Get the target user to check if they're private
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId! },
      select: { isPrivate: true }
    });

    if (!targetUser) {
      return new NextResponse(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404 }
      );
    }

    // Before creating a new follow relationship, delete any existing notifications
    await prisma.notification.deleteMany({
      where: {
        type: {
          in: ["FOLLOW", "FOLLOW_REQUEST"]
        },
        AND: [
          {
            OR: [
              { sender_id: session.user.id },
              { sender_id: followingId }
            ]
          },
          {
            OR: [
              { userId: session.user.id },
              { userId: followingId }
            ]
          }
        ]
      },
    });

    // Create the follow relationship
    const follow = await prisma.follows.create({
      data: {
        followerId: session.user.id,
        followingId: followingId!,
        status: targetUser.isPrivate ? "PENDING" : "ACCEPTED"
      }
    });

    // Create a single new notification
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: followingId!,
        type: targetUser.isPrivate ? "FOLLOW_REQUEST" : "FOLLOW",
        sender_id: session.user.id,
        createdAt: new Date()
      }
    });

    return new NextResponse(
      JSON.stringify({ 
        status: follow.status,
        message: follow.status === "PENDING" 
          ? "Follow request sent" 
          : "Successfully followed"
      }), 
      { status: 200 }
    );

  } catch (error) {
    console.error("[FOLLOW_API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to process follow request"
      }), 
      { status: 500 }
    );
  }
} 