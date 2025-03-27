import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const { fileUrl, caption, location, taggedUsers, aspectRatio = 1 } = json;

    if (!fileUrl) {
      return new NextResponse("File URL is required", { status: 400 });
    }

    // Create the post
    const post = await prisma.post.create({
      data: {
        id: nanoid(),
        caption,
        location,
        fileUrl,
        aspectRatio,
        user_id: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        likes: true,
        savedBy: true,
        comments: {
          include: {
            user: true,
            likes: true,
            replies: {
              include: {
                user: true,
                likes: true
              }
            }
          }
        },
        tags: {
          include: {
            user: true
          }
        }
      }
    });

    // Create PostTag records and notifications for tagged users
    if (taggedUsers && taggedUsers.length > 0) {
      // Verify all users are being followed by the post creator
      const followingUsers = await prisma.follows.findMany({
        where: {
          followerId: session.user.id,
          followingId: {
            in: taggedUsers.map(u => u.userId)
          },
          status: "ACCEPTED"
        }
      });

      const validUserIds = followingUsers.map(f => f.followingId);

      // Only create tags for valid users (those being followed)
      await prisma.postTag.createMany({
        data: taggedUsers
          .filter(user => validUserIds.includes(user.userId))
          .map(user => ({
            postId: post.id,
            userId: user.userId
          }))
      });

      // Create notifications for tagged users
      await prisma.notification.createMany({
        data: taggedUsers
          .filter(user => validUserIds.includes(user.userId))
          .map(user => ({
            type: "TAG",
            userId: user.userId,
            sender_id: session.user.id,
            postId: post.id
          }))
      });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("[POST_CREATE]", error);
    return new NextResponse(
      JSON.stringify({ 
        message: "Failed to create post",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 