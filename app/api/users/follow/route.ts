import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { FollowUser } from "@/lib/schemas";

const followCooldowns = new Map<string, number>();
const FOLLOW_COOLDOWN_MS = 5000; // 5 seconds cooldown

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Follow API - Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    if (!session?.user?.id) {
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

    // Log the request for debugging
    console.log('Follow API - Request details:', {
      action,
      followerId,
      followingId,
      sessionUserId: session.user.id,
      timestamp: new Date().toISOString()
    });

    // For delete/accept actions, we need followerId
    if ((action === "delete" || action === "accept") && !followerId) {
      console.log('Follow API - Missing followerId for action:', {
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
      console.log('Follow API - Missing followingId for action:', {
        action,
        followingId,
        timestamp: new Date().toISOString()
      });
      return new NextResponse(
        JSON.stringify({ error: "Missing followingId" }),
        { status: 400 }
      );
    }

    if (action === "accept") {
      console.log('Follow API - Processing accept action:', {
        followerId,
        sessionUserId: session.user.id,
        timestamp: new Date().toISOString()
      });
      
      // First check if there's a pending follow request
      console.log('Follow API - Checking for pending request with params:', {
        followerId,
        followingId: session.user.id
      });

      const pendingRequest = await prisma.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: followerId!,
            followingId: session.user.id
          }
        }
      });

      console.log('Follow API - Pending request query result:', {
        found: !!pendingRequest,
        request: pendingRequest,
        timestamp: new Date().toISOString()
      });

      if (!pendingRequest || pendingRequest.status !== "PENDING") {
        console.log('Follow API - No valid pending request:', {
          found: !!pendingRequest,
          status: pendingRequest?.status,
          followerId,
          followingId: session.user.id,
          timestamp: new Date().toISOString()
        });
        return new NextResponse(
          JSON.stringify({ error: "No pending follow request found" }),
          { status: 404 }
        );
      }

      // Update the follow request status to ACCEPTED
      console.log('Follow API - Updating follow request to ACCEPTED');
      const updatedFollow = await prisma.follows.update({
        where: {
          followerId_followingId: {
            followerId: followerId!,
            followingId: session.user.id
          }
        },
        data: {
          status: "ACCEPTED"
        }
      });

      console.log('Follow API - Updated follow request result:', {
        updatedFollow,
        timestamp: new Date().toISOString()
      });

      // Delete any existing follow notifications between these users
      await prisma.notification.deleteMany({
        where: {
          type: {
            in: ["FOLLOW", "FOLLOW_REQUEST"]
          },
          OR: [
            {
              sender_id: followerId!,
              userId: session.user.id,
            },
            {
              sender_id: session.user.id,
              userId: followerId!,
            }
          ]
        },
      });

      // Create a single new follow notification
      await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          type: "FOLLOW",
          userId: session.user.id,
          sender_id: followerId!,
          createdAt: new Date()
        }
      });

      return new NextResponse(
        JSON.stringify({ 
          status: "ACCEPTED",
          message: "Follow request accepted"
        }), 
        { status: 200 }
      );
    }

    if (action === "delete") {
      console.log('Follow API - Processing delete action');
      
      // Get the current user's ID
      const currentUserId = session.user.id;
      
      // Delete the follow request
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: followingId!
          }
        }
      });

      // Delete ALL follow-related notifications between these users
      await prisma.notification.deleteMany({
        where: {
          type: {
            in: ["FOLLOW", "FOLLOW_REQUEST"]
          },
          OR: [
            {
              sender_id: currentUserId,
              userId: followingId!,
            },
            {
              sender_id: followingId!,
              userId: currentUserId,
            }
          ]
        },
      });

      return new NextResponse(
        JSON.stringify({ 
          status: "DELETED",
          message: "Follow request cancelled"
        }), 
        { status: 200 }
      );
    }

    // If followerId is provided in body, use it, otherwise use session user id
    const actualFollowerId = session.user.id;

    // Check if there's an existing follow relationship
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: actualFollowerId,
          followingId: followingId!
        }
      }
    });

    if (action === "unfollow") {
      if (!existingFollow) {
        return new NextResponse(
          JSON.stringify({ error: "Follow relationship not found" }),
          { status: 404 }
        );
      }

      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: actualFollowerId,
            followingId: followingId!
          }
        }
      });

      // Delete ALL follow-related notifications between these users
      await prisma.notification.deleteMany({
        where: {
          type: {
            in: ["FOLLOW", "FOLLOW_REQUEST"]
          },
          AND: [
            {
              OR: [
                { sender_id: actualFollowerId },
                { sender_id: followingId }
              ]
            },
            {
              OR: [
                { userId: actualFollowerId },
                { userId: followingId }
              ]
            }
          ]
        },
      });

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
              { sender_id: actualFollowerId },
              { sender_id: followingId }
            ]
          },
          {
            OR: [
              { userId: actualFollowerId },
              { userId: followingId }
            ]
          }
        ]
      },
    });

    // Create the follow relationship
    const follow = await prisma.follows.create({
      data: {
        followerId: actualFollowerId,
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
        sender_id: actualFollowerId,
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
    console.error("Follow API Error:", {
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