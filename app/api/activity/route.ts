import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

interface PostWithUser {
  id: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    verified: boolean;
  };
}

interface LikeWithPost {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  postId: string | null;
  reelId: string | null;
  storyId: string | null;
  user_id: string;
  post: PostWithUser | null;
}

interface CommentWithPost {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  postId: string | null;
  reelId: string | null;
  user_id: string;
  parentId: string | null;
  post: PostWithUser | null;
}

interface SavedPostWithPost {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  postId: string;
  user_id: string;
  post: PostWithUser | null;
}

export async function GET() {
  noStore(); // Disable caching for this route
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse("Unauthorized", { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const userId = session.user.id;
    if (!userId) {
      return new NextResponse("User ID not found", { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const [likes, comments, savedPosts] = await Promise.all([
      // Get user's likes with post details
      prisma.like.findMany({
        where: {
          user_id: userId,
          postId: { not: null },
          post: {
            user: {
              status: {
                not: "BANNED"
              }
            }
          }
        },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                  verified: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // Get user's comments with post details
      prisma.comment.findMany({
        where: {
          user_id: userId,
          postId: { not: null },
          post: {
            user: {
              status: {
                not: "BANNED"
              }
            }
          }
        },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                  verified: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // Get user's saved posts with post details
      prisma.savedpost.findMany({
        where: {
          user_id: userId,
          post: {
            user: {
              status: {
                not: "BANNED"
              }
            }
          }
        },
        include: {
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                  verified: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Filter out any null posts or posts from banned users
    const filteredLikes = (likes as LikeWithPost[]).filter(like => like.post && like.post.user);
    const filteredComments = (comments as CommentWithPost[]).filter(comment => comment.post && comment.post.user);
    const filteredSavedPosts = (savedPosts as SavedPostWithPost[]).filter(saved => saved.post && saved.post.user);

    return NextResponse.json({
      likes: filteredLikes,
      comments: filteredComments,
      savedPosts: filteredSavedPosts
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch activity data" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 