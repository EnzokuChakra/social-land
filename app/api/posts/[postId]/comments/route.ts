import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// Define the types for our comment structure
type CommentUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  verified: boolean;
};

type CommentLike = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  commentId: string;
  user_id: string;
};

type Comment = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  postId: string | null;
  reelId: string | null;
  user_id: string;
  parentId: string | null;
  user: CommentUser;
  likes: CommentLike[];
};

type CommentWithReplies = Comment & {
  replies: CommentWithReplies[];
};

export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Await the params object before using it
    const { postId } = await Promise.resolve(params);

    const totalComments = await db.comment.count({
      where: {
        postId,
        parentId: null
      }
    });

    const comments = await db.comment.findMany({
      where: {
        postId,
        parentId: null
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
            bio: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            password: true,
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
              },
            },
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
              },
            },
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true,
                    verified: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = totalComments > page * limit;

    return NextResponse.json({
      comments,
      hasMore,
      totalComments,
    });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
} 