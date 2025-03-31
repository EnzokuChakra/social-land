import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { FollowUser } from "@/lib/schemas";

const followCooldowns = new Map<string, number>();
const FOLLOW_COOLDOWN_MS = 5000; // 5 seconds cooldown

export async function POST(req: Request) {
  try {
    console.log("[Follow API] Received follow request");
    const session = await getServerSession(authOptions);
    
    console.log("[Follow API] Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    if (!session?.user?.id) {
      console.log("[Follow API] Unauthorized request - no session");
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log("[Follow API] Request body:", body);
    
    const validatedData = FollowUser.parse(body);
    const { followingId, followerId, action } = validatedData;
    
    console.log("[Follow API] Validated request data:", {
      followingId,
      followerId,
      action,
      sessionUserId: session.user.id
    });

    // Add rate limiting for follow action
    if (action === "follow") {
      const cooldownKey = `${session.user.id}-${followingId}`;
      const lastFollowTime = followCooldowns.get(cooldownKey);
      const now = Date.now();

      console.log("[Follow API] Rate limit check:", {
        cooldownKey,
        lastFollowTime,
        now,
        timeSinceLastFollow: lastFollowTime ? now - lastFollowTime : null
      });

      if (lastFollowTime && now - lastFollowTime < FOLLOW_COOLDOWN_MS) {
        console.log("[Follow API] Rate limit exceeded");
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
      console.log("[Follow API] Missing followerId for action:", {
        action,
        followerId,
        timestamp: new Date().toISOString()
      });
      return new NextResponse(
        JSON.stringify({ error: "Missing followerId" }),
        { status: 400 }
      );
    }

    // For follow/unfollow actions, we need followingId
    if ((action === "follow" || action === "unfollow") && !followingId) {
      console.log("[Follow API] Missing followingId for action:", {
        action,
        followingId,
        timestamp: new Date().toISOString()
      });
      return new NextResponse(
        JSON.stringify({ error: "Missing followingId" }),
        { status: 400 }
      );
    }

    // Check if there's an existing follow relationship
    console.log("[Follow API] Checking for existing follow relationship");
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: followingId!
        }
      }
    });

    console.log("[Follow API] Existing follow relationship:", existingFollow);

    if (action === "unfollow") {
      console.log("[Follow API] Processing unfollow action");
      if (!existingFollow) {
        console.log("[Follow API] No follow relationship found to unfollow");
        return new NextResponse(
          JSON.stringify({ error: "Follow relationship not found" }),
          { status: 404 }
        );
      }

      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: followingId!
          }
        }
      });

      console.log("[Follow API] Deleted follow relationship");

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

      console.log("[Follow API] Deleted related notifications");

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
      console.log("[Follow API] Follow relationship already exists:", existingFollow);
      return new NextResponse(
        JSON.stringify({ 
          error: "Already following or requested",
          status: existingFollow.status
        }), 
        { status: 400 }
      );
    }

    // Get the target user to check if they're private
    console.log("[Follow API] Checking target user privacy settings");
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId! },
      select: { isPrivate: true }
    });

    console.log("[Follow API] Target user privacy settings:", targetUser);

    if (!targetUser) {
      console.log("[Follow API] Target user not found");
      return new NextResponse(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404 }
      );
    }

    // Before creating a new follow relationship, delete any existing notifications
    console.log("[Follow API] Cleaning up existing notifications");
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
    console.log("[Follow API] Creating new follow relationship");
    const follow = await prisma.follows.create({
      data: {
        followerId: session.user.id,
        followingId: followingId!,
        status: targetUser.isPrivate ? "PENDING" : "ACCEPTED"
      }
    });

    console.log("[Follow API] Created follow relationship:", follow);

    // Create a single new notification
    console.log("[Follow API] Creating notification");
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId: followingId!,
        type: targetUser.isPrivate ? "FOLLOW_REQUEST" : "FOLLOW",
        sender_id: session.user.id,
        createdAt: new Date()
      }
    });

    console.log("[Follow API] Created notification");

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
    console.error("[Follow API] Error:", {
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