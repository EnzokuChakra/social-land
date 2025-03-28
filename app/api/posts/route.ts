import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string;
    const aspectRatio = Number(formData.get("aspectRatio") as string);
    const location = formData.get("location") as string;
    const taggedUsersJson = formData.get("taggedUsers") as string;

    if (!file) {
      return new NextResponse("File is required", { status: 400 });
    }

    // Upload to blob storage
    const blob = await put(`posts/${nanoid()}.${file.type.split("/")[1]}`, file, {
      access: "public",
    });

    // Create post
    const post = await prisma.post.create({
      data: {
        caption,
        fileUrl: blob.url,
        aspectRatio,
        location,
        user_id: session.user.id,
      },
    });

    // Handle tagged users
    if (taggedUsersJson) {
      const taggedUsers = JSON.parse(taggedUsersJson) as { userId: string; username: string }[];
      
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

      const validUserIds = followingUsers.map((f: { followerId: string; followingId: string; status: string; createdAt: Date }) => f.followingId);

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

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[POSTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 