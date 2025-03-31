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
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get the post ID from the params - properly awaiting the Promise
    const { postId } = await params;
    
    if (!postId) {
      return new NextResponse("Post ID is required", { status: 400 });
    }

    // Get pagination parameters from the URL
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    // Get total count of top-level comments
    const totalComments = await db.comment.count({
      where: {
        postId,
        parentId: null // Only count top-level comments
      }
    });

    // Fetch paginated comments for the post
    const comments = await db.comment.findMany({
      where: {
        postId,
        parentId: null // Only fetch top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            verified: true,
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true, 
                name: true,
                username: true,
                image: true,
                verified: true,
              }
            }
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                verified: true,
              }
            },
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    verified: true,
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit
    });
    
    return NextResponse.json({
      comments,
      page,
      limit,
      totalComments,
      hasMore: totalComments > (skip + comments.length)
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 