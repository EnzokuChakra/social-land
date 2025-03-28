import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

interface TaggedUser {
  userId: string;
  username: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    console.log("[POST_CREATE] Received request:", {
      userId: session.user.id,
      fileUrl: json.fileUrl ? "present" : "missing",
      caption: json.caption ? "present" : "missing",
      location: json.location ? "present" : "missing",
      taggedUsers: json.taggedUsers?.length || 0
    });

    const { fileUrl, caption, location, taggedUsers, aspectRatio = 1 } = json;

    if (!fileUrl) {
      return new NextResponse("File URL is required", { status: 400 });
    }

    // Create the post with required fields
    const post = await prisma.post.create({
      data: {
        id: nanoid(),
        caption,
        location,
        fileUrl,
        aspectRatio,
        user_id: session.user.id,
        updatedAt: new Date(),
        createdAt: new Date()
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

    console.log("[POST_CREATE] Post created successfully:", { postId: post.id });

    // Create PostTag records and notifications for tagged users
    if (taggedUsers && taggedUsers.length > 0) {
      try {
        // Verify all users are being followed by the post creator
        const followingUsers = await prisma.follows.findMany({
          where: {
            followerId: session.user.id,
            followingId: {
              in: (taggedUsers as TaggedUser[]).map((u: TaggedUser) => u.userId)
            },
            status: "ACCEPTED"
          }
        });

        const validUserIds = followingUsers.map(f => f.followingId);

        // Only create tags for valid users (those being followed)
        await prisma.postTag.createMany({
          data: (taggedUsers as TaggedUser[])
            .filter((user: TaggedUser) => validUserIds.includes(user.userId))
            .map((user: TaggedUser) => ({
              id: nanoid(),
              postId: post.id,
              userId: user.userId
            }))
        });

        // Create notifications for tagged users with required id field
        await prisma.notification.createMany({
          data: (taggedUsers as TaggedUser[])
            .filter((user: TaggedUser) => validUserIds.includes(user.userId))
            .map((user: TaggedUser) => ({
              id: nanoid(),
              type: "TAG",
              userId: user.userId,
              sender_id: session.user.id,
              postId: post.id,
              createdAt: new Date()
            }))
        });

        console.log("[POST_CREATE] Tags and notifications created successfully");

        // After creating tags, fetch the updated post with tags
        const updatedPost = await prisma.post.findUnique({
          where: { id: post.id },
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

        return NextResponse.json(updatedPost);
      } catch (tagError) {
        console.error("[POST_CREATE] Error creating tags/notifications:", tagError);
        // Return the post even if tag creation fails
        return NextResponse.json(post);
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("[POST_CREATE] Error creating post:", error);
    return new NextResponse(
      JSON.stringify({ 
        message: "Failed to create post",
        error: error instanceof Error ? error.message : "Unknown error"
      }), 
      { status: 500 }
    );
  }
} 