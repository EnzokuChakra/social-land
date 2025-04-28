"use server";

import { getUserId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BookmarkSchema,
  CreateComment,
  CreatePost,
  DeleteComment,
  DeletePost,
  FollowUser,
  LikeSchema,
  UpdatePost,
  UpdateUser,
} from "./schemas";
import { auth } from "@/lib/auth";
import {
  NotificationType,
  NotificationWithExtras,
  FollowAction,
  FollowResponse,
  FollowStatus,
} from "@/lib/definitions";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/uploadFile";
import { deleteUploadedFile } from "@/lib/server-utils";
import { PrismaClient, Prisma } from "@prisma/client";
import { QueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";

// Simple server-side function to replace client-side invalidateProfileStats
function invalidateProfileStats(username: string) {
  if (username) {
    revalidatePath(`/dashboard/${username}`);
    revalidatePath(`/dashboard/${username}/followers`);
    revalidatePath(`/dashboard/${username}/following`);
    revalidatePath(`/dashboard/${username}/saved`);
  }
}

const followCooldowns = new Map<string, number>();
const FOLLOW_COOLDOWN_MS = 5000; // 5 seconds cooldown

// Initialize Prisma client
const prismaClient = prisma;

function ensureDb() {
  if (!db) {
    throw new Error("Database connection not available");
  }
  return db;
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("Prisma connection not available");
  }
  return prisma;
}

export async function createPost(values: z.infer<typeof CreatePost>) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const db = ensureDb();
  const post = await db.post.create({
    data: {
      id: crypto.randomUUID(),
      updatedAt: new Date(),
      caption: values.caption,
      fileUrl: values.fileUrl,
      user_id: session.user.id,
      aspectRatio: values.aspectRatio,
      location: values.location,
    },
  });

  // Get the user's username for stats invalidation
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (user?.username) {
    // Revalidate the profile page to update the stats
    revalidatePath(`/dashboard/${user.username}`);
    
    // Invalidate the stats query
    invalidateProfileStats(user.username);

    // Emit socket event to notify clients that a post was created
    try {
      if (typeof window === 'undefined') {
        const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${socketUrl}/api/socket/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'postCreated',
            data: { 
              postId: post.id,
              userId: session.user.id,
              username: user.username
            }
          }),
        });
      }
    } catch (error) {
      console.error("[createPost] Error emitting socket event:", error);
      // Don't fail if socket emission fails
    }
  }

  revalidatePath("/dashboard");
  return post;
}

export async function deletePost(postId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const db = ensureDb();
    // First check if the user owns the post and get the file URL
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { 
        user_id: true, 
        fileUrl: true,
        user: {
          select: {
            username: true
          }
        }
      },
    });

    if (!post) {
      // If post is already deleted, just return success
      return { message: "Post already deleted" };
    }

    // Allow deletion if user is post owner, MASTER_ADMIN, or ADMIN
    const isPostOwner = post.user_id === session.user.id;
    const isMasterAdmin = session.user.role === "MASTER_ADMIN";
    const isAdmin = session.user.role === "ADMIN";

    if (!isPostOwner && !isMasterAdmin && !isAdmin) {
      throw new Error("Not authorized to delete this post");
    }

    // Try to delete the file, but don't fail if it's already gone
    if (post.fileUrl) {
      try {
        await deleteUploadedFile(post.fileUrl);
      } catch (error) {
        console.error("Error deleting file, continuing with post deletion:", error);
        // Don't re-throw, continue with post deletion
      }
    }

    try {
      // Delete all related records in a transaction
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // Delete all saved posts
        await tx.savedpost.deleteMany({
          where: { postId }
        });

        // Delete all likes
        await tx.like.deleteMany({
          where: { postId }
        });

        // First get all comments for this post
        const comments = await tx.comment.findMany({
          where: { postId },
          select: { 
            id: true,
            parentId: true
          }
        });
        
        if (comments.length > 0) {
          // Get all comment IDs
          const allCommentIds = comments.map((c: { id: string }) => c.id);

          // First delete comment reports for all comments
          await tx.commentreport.deleteMany({
            where: { commentId: { in: allCommentIds } }
          });
          
          // Delete comment likes for all comments
          await tx.commentlike.deleteMany({
            where: { commentId: { in: allCommentIds } }
          });
          
          // Separate parent and child comments
          const parentComments = comments.filter((c: { id: string; parentId: string | null }) => !c.parentId);
          const childComments = comments.filter((c: { id: string; parentId: string | null }) => c.parentId);
          
          // Delete child comments (replies) first
          if (childComments.length > 0) {
            await tx.comment.deleteMany({
              where: {
                id: { in: childComments.map((c: { id: string }) => c.id) }
              }
            });
          }
          
          // Then delete parent comments
          await tx.comment.deleteMany({
            where: {
              id: { in: parentComments.map((c: { id: string }) => c.id) }
            }
          });
        }

        // Delete all tags
        await tx.posttag.deleteMany({
          where: { postId }
        });

        // Delete all notifications
        await tx.notification.deleteMany({
          where: { postId }
        });

        // Delete all reports
        await tx.report.deleteMany({
          where: { postId }
        });

        // Finally delete the post
        await tx.post.delete({
          where: { id: postId }
        });
      });
    } catch (error) {
      console.error("Transaction error during post deletion:", error);
      throw new Error("Failed to delete post and its related data");
    }

    // Invalidate profile stats for the post owner
    if (post.user?.username) {
      const queryClient = new QueryClient();
      queryClient.invalidateQueries({ queryKey: ['profileStats', post.user.username] });
    }

    // Emit socket event to notify clients that the post was deleted
    try {
      // If on the server side with socket API available
      // This will only run on the server
      if (typeof window === 'undefined') {
        // Use fetch to call the API endpoint that will emit the socket event
        const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        console.log(`[deletePost] Emitting postDeleted event via ${socketUrl}/api/socket/emit`);
        
        try {
          const response = await fetch(`${socketUrl}/api/socket/emit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'postDeleted',
              data: { postId }
            }),
          });

          if (!response.ok) {
            console.error(`[deletePost] Failed to emit socket event: ${response.status} ${response.statusText}`);
          } else {
            console.log('[deletePost] Socket event emitted successfully');
          }
        } catch (socketError) {
          console.error('[deletePost] Socket error:', socketError);
          // Don't fail if socket emission fails
        }
      }
    } catch (error) {
      console.error("[deletePost] Error emitting socket event:", error);
      // Don't fail if socket emission fails
    }

    // Revalidate all necessary paths
    revalidatePath("/dashboard");
    if (post.user?.username) {
      revalidatePath(`/dashboard/${post.user.username}`);
    }
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/");

    return { message: "Post deleted successfully" };
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}

async function createNotification({
  type,
  user_id,
  postId,
  commentId,
  storyId,
  metadata,
}: {
  type: NotificationType;
  user_id: string;
  postId?: string;
  commentId?: string;
  storyId?: string;
  metadata?: string;
}) {
  const sender_id = await getUserId();
  if (sender_id === user_id) return;

  try {
    const prisma = ensurePrisma();
    
    // For bulk notifications (like EVENT_CREATED), use a transaction
    if (type === "EVENT_CREATED") {
      const users = await prisma.user.findMany({
        where: { id: { not: sender_id } },
        select: { id: true }
      });

      await prisma.$transaction(
        users.map((user: { id: string }) => 
          prisma.notification.create({
            data: {
              id: crypto.randomUUID(),
              type,
              userId: user.id,
              sender_id,
              metadata: JSON.stringify({
                eventId: postId,
                eventName: commentId // We're using commentId as eventName here
              }),
            },
          })
        )
      );
      return;
    }

    // For single notifications, use a single query
    const data = {
      id: crypto.randomUUID(),
      type,
      userId: user_id,
      sender_id,
      postId,
      storyId,
      metadata
    };

    // Add metadata based on notification type
    if (type === "LIKE" && postId) {
      const [otherLikes, existingNotification] = await Promise.all([
        prisma.like.count({
          where: {
            postId,
            user_id: { not: sender_id }
          }
        }),
        prisma.notification.findFirst({
          where: {
            type: "LIKE",
            userId: user_id,
            postId
          },
          orderBy: { createdAt: "desc" }
        })
      ]);

      if (existingNotification) {
        await prisma.notification.update({
          where: { id: existingNotification.id },
          data: {
            sender_id,
            createdAt: new Date(),
            metadata: JSON.stringify({ 
              othersCount: otherLikes,
              lastLikerId: sender_id
            })
          }
        });
        return;
      }

      data.metadata = JSON.stringify({ 
        othersCount: otherLikes,
        lastLikerId: sender_id
      });
    }

    await prisma.notification.create({ data });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export async function likePost(value: z.infer<typeof LikeSchema>) {
  const user_id = await getUserId();
  console.log("[likePost] Starting like action:", {
    postId: value.postId,
    userId: user_id,
    timestamp: new Date().toISOString()
  });

  const validatedFields = LikeSchema.safeParse(value);

  if (!validatedFields.success) {
    console.error("[likePost] Validation failed:", {
      errors: validatedFields.error.flatten().fieldErrors,
      timestamp: new Date().toISOString()
    });
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Like Post.",
    };
  }

  const { postId } = validatedFields.data;
  try {
    const db = ensureDb();
    const existingLike = await db.like.findUnique({
      where: {
        postId_user_id: {
          postId,
          user_id,
        },
      },
    });

    console.log("[likePost] Existing like check:", {
      postId,
      userId: user_id,
      exists: !!existingLike,
      timestamp: new Date().toISOString()
    });

    if (existingLike) {
      console.log("[likePost] Deleting existing like:", {
        postId,
        userId: user_id,
        timestamp: new Date().toISOString()
      });
      
      await db.like.delete({
        where: {
          postId_user_id: {
            postId,
            user_id,
          },
        },
      });
      
      const updatedPost = await db.post.findUnique({
        where: {
          id: postId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              image: true,
              bio: true,
              verified: true,
              isPrivate: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          tags: {
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
          comments: {
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
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          likes: {
            include: {
              user: true,
            },
          },
          savedBy: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!updatedPost) {
        throw new Error("Post not found after unlike");
      }

      console.log("[likePost] Post unliked successfully:", {
        postId,
        userId: user_id,
        newLikesCount: updatedPost.likes.length,
        timestamp: new Date().toISOString()
      });

      revalidatePath("/dashboard");
      return {
        message: "Post unliked successfully",
        post: updatedPost,
        unlike: true,
      };
    }

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        user_id: true,
      },
    });

    if (!post) {
      console.error("[likePost] Post not found:", {
        postId,
        timestamp: new Date().toISOString()
      });
      return {
        message: "Post not found",
      };
    }

    console.log("[likePost] Creating new like:", {
      postId,
      userId: user_id,
      postOwnerId: post.user_id,
      timestamp: new Date().toISOString()
    });

    await db.like.create({
      data: {
        id: crypto.randomUUID(),
        postId,
        user_id,
        updatedAt: new Date(),
      },
    });

    await createNotification({
      type: "LIKE",
      user_id: post.user_id,
      postId,
    });

    const updatedPost = await db.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            bio: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tags: {
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
        comments: {
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
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        likes: {
          include: {
            user: true,
          },
        },
        savedBy: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!updatedPost) {
      throw new Error("Post not found after like");
    }

    const likedBy = await db.user.findUnique({
      where: {
        id: user_id,
      },
    });

    console.log("[likePost] Post liked successfully:", {
      postId,
      userId: user_id,
      newLikesCount: updatedPost.likes.length,
      timestamp: new Date().toISOString()
    });

    revalidatePath("/dashboard");
    return {
      message: "Post liked successfully",
      post: updatedPost,
      unlike: false,
      likedBy,
    };
  } catch (error) {
    console.error("[likePost] Error:", {
      error,
      postId,
      userId: user_id,
      timestamp: new Date().toISOString()
    });
    return {
      message: "Database Error: Failed to Like/Unlike Post.",
    };
  }
}

export async function bookmarkPost(formData: FormData) {
  const user_id = await getUserId();
  const postId = formData.get("postId");

  const validatedFields = BookmarkSchema.safeParse({ postId });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Bookmark Post.",
    };
  }

  const { postId: validatedPostId } = validatedFields.data;

  const db = ensureDb();
  const post = await db.post.findUnique({
    where: {
      id: validatedPostId,
    },
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!post) {
    throw new Error("Post not found.");
  }

  const bookmark = await db.savedpost.findFirst({
    where: {
      postId: validatedPostId,
      user_id: user_id,
    },
  });

  try {
    if (bookmark) {
      await db.savedpost.delete({
        where: {
          id: bookmark.id,
        },
      });
    } else {
      await db.savedpost.create({
        data: {
          id: crypto.randomUUID(),
          postId: validatedPostId,
          user_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Get current user's username for path revalidation
    const currentUser = await db.user.findUnique({
      where: { id: user_id },
      select: { username: true },
    });

    // Revalidate all necessary paths
    revalidatePath("/");
    revalidatePath("/dashboard");
    if (currentUser?.username) {
      revalidatePath(`/dashboard/${currentUser.username}`);
      revalidatePath(`/dashboard/${currentUser.username}/saved`);
    }
    if (post.user.username) {
      revalidatePath(`/dashboard/${post.user.username}`);
    }
    revalidatePath(`/dashboard/p/${validatedPostId}`);

    return {
      message: bookmark
        ? "Post removed from saved."
        : "Post saved successfully.",
    };
  } catch (error) {
    console.error("Error in bookmarkPost:", error);
    throw new Error("Failed to save/unsave post.");
  }
}

export async function createComment(values: z.infer<typeof CreateComment>) {
  const userId = await getUserId();

  try {
    const { postId, body, parentId } = values;

    const db = ensureDb();
    // Verify the post exists
    if (!postId) {
      throw new Error("Post ID is required");
    }
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, user_id: true }
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Create the comment
    const comment = await db.comment.create({
      data: {
        id: crypto.randomUUID(),
        body,
        postId,
        parentId: parentId || null,
        user_id: userId,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        likes: true,
        replies: {
          include: {
            user: true,
            likes: true,
          }
        }
      }
    });

    console.log("[CREATE_COMMENT] Created comment:", {
      id: comment.id,
      parentId: comment.parentId,
      body: comment.body
    });

    if (parentId) {
      // If this is a reply, get the parent comment's user
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
        select: { user_id: true },
      });

      if (parentComment && parentComment.user_id !== userId) {
        // Create notification for comment reply
        await createNotification({
          type: "REPLY",
          user_id: parentComment.user_id,
          postId: postId ?? undefined,
          commentId: comment.id,
        });
        console.log("[CREATE_COMMENT] Created reply notification");
      }
    } else if (post.user_id !== userId) {
      // Get count of other comments (excluding the current user)
      const otherComments = await db.comment.count({
        where: {
          postId,
          user_id: {
            not: userId,
          },
          parentId: null, // Only count top-level comments
        },
      });

      // Create notification for top-level comment
      await createNotification({
        type: "COMMENT",
        user_id: post.user_id,
        postId: postId ?? undefined,
        commentId: comment.id,
        metadata: JSON.stringify({
          othersCount: otherComments,
          lastCommenterId: userId
        }),
      });
      console.log("[CREATE_COMMENT] Created comment notification");
    }

    // Revalidate both dashboard and specific post page
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath(`/dashboard/p/${postId}/`);

    // Emit socket event for real-time update
    if (global.io) {
      global.io.emit("commentCreate", {
        postId,
        comment: {
          ...comment,
          user: comment.user,
          likes: comment.likes,
          replies: comment.replies,
        },
      });
      console.log("[SOCKET_COMMENT] TESTING SOCKET COMMENT");
    }

    return { 
      message: "Comment Created Successfully",
      comment: comment
    };
  } catch (error) {
    console.error("[CREATE_COMMENT] Error:", error);
    throw error;
  }
}

export async function deleteComment(formData: FormData) {
  const userId = await getUserId();

  const { id } = DeleteComment.parse({
    id: formData.get("id"),
  });

  if (!id || typeof id !== 'string') {
    throw new Error("Invalid comment ID");
  }

  try {
    const prisma = ensurePrisma();
    // First verify the comment exists and get post ownership info
    const comment = await prisma.comment.findFirst({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            user_id: true
          }
        }
      }
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (!comment.post) {
      throw new Error("Post not found for comment");
    }

    // Check if user is either comment owner or post owner
    const isCommentOwner = comment.user_id === userId;
    const isPostOwner = comment.post.user_id === userId;

    if (!isCommentOwner && !isPostOwner) {
      throw new Error("You don't have permission to delete this comment");
    }

    // Delete all comment reports first
    await prisma.commentreport.deleteMany({
      where: {
        commentId: id
      }
    });

    // Delete all likes associated with the comment
    await prisma.commentlike.deleteMany({
      where: {
        commentId: id
      }
    });

    // Delete all replies to this comment (if it's a parent comment)
    await prisma.comment.deleteMany({
      where: {
        parentId: id
      }
    });

    // Finally delete the comment itself
    await prisma.comment.delete({
      where: {
        id
      }
    });

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.emit("deleteComment", {
        postId: comment.post.id,
        commentId: id,
        parentId: comment.parentId
      });
    }

    revalidatePath("/dashboard");
    return { message: "Comment deleted successfully" };
  } catch (error) {
    console.error("[DELETE_COMMENT]", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Error deleting comment");
  }
}

export async function updatePost(values: z.infer<typeof UpdatePost>) {
  try {
    const user_id = await getUserId();

    const validatedFields = UpdatePost.safeParse(values);

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Missing Fields. Failed to Update Post.",
      };
    }

    const { id, fileUrl, caption } = validatedFields.data;

    const db = ensureDb();
    const post = await db.post.findUnique({
      where: {
        id,
        user_id,
      },
    });

    if (!post) {
      return { message: "Post not found or unauthorized" };
    }

    await db.post.update({
      where: {
        id,
      },
      data: {
        fileUrl,
        caption,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error in updatePost:", error);
    return { message: "Database Error: Failed to Update Post." };
  }
}

export async function updateProfile(values: z.infer<typeof UpdateUser>) {
  const user_id = await getUserId();

  console.log("[UPDATE_PROFILE] Received values:", values);

  const validatedFields = UpdateUser.safeParse(values);

  if (!validatedFields.success) {
    console.error("[UPDATE_PROFILE] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Profile.",
    };
  }

  const { name, image, bio, isPrivate } = validatedFields.data;

  try {
    const prisma = ensurePrisma();

    // Get current user data to check for existing image and privacy status
    const currentUser = await prisma.user.findUnique({
      where: { id: user_id },
      select: { 
        image: true,
        isPrivate: true
      }
    });

    if (!currentUser) {
      console.error("[UPDATE_PROFILE] User not found:", user_id);
      return { 
        message: "User not found",
        errors: {
          form: ["User not found"]
        }
      };
    }

    // If updating image and it's not the placeholder, delete old image if it exists
    if (image && image !== currentUser.image && currentUser.image && !currentUser.image.includes('profile_placeholder.webp')) {
      try {
        await deleteUploadedFile(currentUser.image);
      } catch (error) {
        console.error("[UPDATE_PROFILE] Error deleting old image:", error);
      }
    }

    // Prepare update data
    const updateData = {
      ...(name !== undefined && { name }),
      ...(image !== undefined && { image: image || "/images/profile_placeholder.webp" }), // Always set a default image
      ...(bio !== undefined && { bio }),
      ...(isPrivate !== undefined && { isPrivate })
    };

    console.log("[UPDATE_PROFILE] Update data:", updateData);

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        isPrivate: true
      }
    });

    // Emit privacy change event if privacy was updated
    if (isPrivate !== undefined && isPrivate !== currentUser.isPrivate) {
      const socket = getSocket();
      if (socket) {
        socket.emit('privacyChanged', {
          userId: user_id,
          isPrivate: isPrivate
        });
      }
    }

    return {
      message: "Profile updated successfully",
      user: updatedUser
    };
  } catch (error) {
    console.error("[UPDATE_PROFILE] Error:", error);
    return {
      message: "Failed to update profile",
      errors: {
        form: ["Failed to update profile"]
      }
    };
  }
}

export async function followUser({
  followingId,
  action = "follow",
  skipRevalidation = false
}: {
  followingId: string;
  action?: FollowAction;
  skipRevalidation?: boolean;
}): Promise<FollowResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.error("[FOLLOW_ACTION] Unauthorized - no session");
      return {
        error: "Unauthorized",
        status: "UNFOLLOWED",
      };
    }

    const followerId = session.user.id;
    const prisma = ensurePrisma();

    // Check if there's an existing follow relationship
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (action === "unfollow") {
      if (!existingFollow || existingFollow.status !== "ACCEPTED") {
        return {
          error: "Not following this user",
          status: "UNFOLLOWED",
        };
      }

      // Delete the follow relationship
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
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
                { sender_id: followerId },
                { sender_id: followingId }
              ]
            },
            {
              OR: [
                { userId: followerId },
                { userId: followingId }
              ]
            }
          ]
        },
      });

      if (!skipRevalidation) {
        revalidateAllPaths();
      }
      return { message: "Unfollowed successfully", status: "UNFOLLOWED" };
    }

    if (action === "accept") {
      // Find any pending follow request, regardless of ID
      const pendingRequest = await prisma.follows.findFirst({
        where: {
          followerId: followingId,
          followingId: followerId,
          status: "PENDING",
        },
      });

      if (!pendingRequest) {
        return {
          error: "No pending follow request found",
          status: "UNFOLLOWED",
        };
      }

      // Update the follow status to ACCEPTED
      await prisma.follows.update({
        where: {
          followerId_followingId: {
            followerId: followingId,
            followingId: followerId,
          },
        },
        data: {
          status: "ACCEPTED",
        },
      });

      // Delete any existing follow notifications between these users
      await prisma.notification.deleteMany({
        where: {
          type: {
            in: ["FOLLOW", "FOLLOW_REQUEST"]
          },
          OR: [
            {
              sender_id: followingId,
              userId: followerId,
            },
            {
              sender_id: followerId,
              userId: followingId,
            }
          ]
        },
      });

      // Create a single new follow notification
      const notification = await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          type: "FOLLOW",
          userId: followerId,
          sender_id: followingId,
          createdAt: new Date(),
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
                  followerId: followerId,
                },
                select: {
                  status: true,
                },
              },
              following: {
                where: {
                  followingId: followerId,
                },
                select: {
                  status: true,
                },
              },
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
          hasPendingRequest: false
        } : undefined
      };

      // Emit socket event for real-time notification
      if (global.io) {
        global.io.emit("followRequestAccepted", {
          followingId: followerId,
          followerId: followingId,
          status: "ACCEPTED"
        });

        global.io.emit("notification", {
          ...transformedNotification,
          userId: followingId,
          sender: transformedNotification.sender ? {
            id: transformedNotification.sender.id,
            username: transformedNotification.sender.username,
            image: transformedNotification.sender.image,
            isFollowing: transformedNotification.sender.isFollowing,
            hasPendingRequest: false,
            isFollowedByUser: transformedNotification.sender.isFollowedByUser,
            isPrivate: transformedNotification.sender.isPrivate
          } : undefined
        });
        console.log("[FOLLOW_ACTION] Emitted follow notification for user:", followingId);
      }

      if (!skipRevalidation) {
        revalidateAllPaths();
      }
      return { message: "Follow request accepted", status: "ACCEPTED" };
    }

    if (action === "delete") {
      // Find any pending follow request, regardless of ID
      const pendingRequest = await prisma.follows.findFirst({
        where: {
          followerId: followingId,
          followingId: followerId,
          status: "PENDING",
        },
      });

      if (!pendingRequest) {
        return {
          error: "No pending follow request found",
          status: "UNFOLLOWED",
        };
      }

      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: followingId,
            followingId: followerId,
          },
        },
      });

      // Delete the follow request notification
      await prisma.notification.deleteMany({
        where: {
          type: "FOLLOW_REQUEST",
          userId: followerId,
          sender_id: followingId,
        },
      });

      if (!skipRevalidation) {
        revalidateAllPaths();
      }
      return { message: "Follow request deleted", status: "UNFOLLOWED" };
    }

    if (existingFollow) {
      return {
        error: "Already following or requested",
        status: existingFollow.status as FollowStatus,
      };
    }

    // For a new follow request
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId },
      select: { isPrivate: true },
    });

    if (!targetUser) {
      return { error: "User not found", status: "UNFOLLOWED" };
    }

    // Check if there are any existing follow requests
    const existingRequests = await prisma.follows.findMany({
      where: {
        followerId: followerId,
        followingId: followingId,
        status: "PENDING"
      }
    });

    // If there are existing pending requests, delete them to avoid duplicates
    if (existingRequests.length > 0) {
      await prisma.follows.deleteMany({
        where: {
          followerId: followerId,
          followingId: followingId,
          status: "PENDING"
        }
      });

      // Also delete any existing follow request notifications
      await prisma.notification.deleteMany({
        where: {
          type: "FOLLOW_REQUEST",
          userId: followingId,
          sender_id: followerId
        }
      });
    }

    // Delete any existing follow notifications between these users
    await prisma.notification.deleteMany({
      where: {
        type: {
          in: ["FOLLOW", "FOLLOW_REQUEST"]
        },
        AND: [
          {
            OR: [
              { 
                sender_id: followerId,
                userId: followingId 
              },
              { 
                sender_id: followingId,
                userId: followerId 
              }
            ]
          }
        ]
      },
    });

    // Create the follow relationship
    const newFollow = await prisma.follows.create({
      data: {
        followerId: followerId,
        followingId: followingId,
        status: targetUser.isPrivate ? "PENDING" : "ACCEPTED",
      },
    });

    // Create a single new notification
    const notification = await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        type: targetUser.isPrivate ? "FOLLOW_REQUEST" : "FOLLOW",
        userId: followingId,
        sender_id: followerId,
        createdAt: new Date(),
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
                followerId: followingId,
              },
              select: {
                status: true,
              },
            },
            following: {
              where: {
                followingId: followingId,
              },
              select: {
                status: true,
              },
            },
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
        hasPendingRequest: false
      } : undefined
    };

    // Emit socket event for real-time notification
    if (global.io) {
      global.io.emit("notification", {
        ...transformedNotification,
        userId: followingId, // Ensure userId is set correctly
        sender: transformedNotification.sender ? {
          id: transformedNotification.sender.id,
          username: transformedNotification.sender.username,
          image: transformedNotification.sender.image,
          isFollowing: transformedNotification.sender.isFollowing,
          hasPendingRequest: false,
          isFollowedByUser: transformedNotification.sender.isFollowedByUser,
          isPrivate: transformedNotification.sender.isPrivate
        } : undefined
      });
      console.log("[FOLLOW_ACTION] Emitted follow notification for user:", followingId);
    }

    if (!skipRevalidation) {
      revalidateAllPaths();
    }
    return {
      message: targetUser.isPrivate
        ? "Follow request sent"
        : "Followed successfully",
      status: newFollow.status as FollowStatus,
    };
  } catch (error) {
    console.error("[FOLLOW_ACTION] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return { error: "Something went wrong", status: "UNFOLLOWED" };
  }
}

async function revalidateAllPaths(username?: string) {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard/explore");

  if (username) {
    revalidatePath(`/dashboard/${username}`);
    revalidatePath(`/dashboard/${username}/followers`);
    revalidatePath(`/dashboard/${username}/following`);
    revalidatePath(`/dashboard/${username}/saved`);
  }
}

export async function createStory(data: { fileUrl: string; scale: number }) {
  try {
    const user_id = await getUserId();
    if (!user_id) {
      return { error: "Not authenticated" };
    }

    if (!data.fileUrl) {
      return { error: "No file URL provided" };
    }

    const db = ensureDb();
    const story = await db.story.create({
      data: {
        id: crypto.randomUUID(),
        fileUrl: data.fileUrl,
        scale: data.scale || 1,
        user_id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true,
          },
        },
        views: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Emit socket event to notify clients about the new story
    try {
      if (typeof window === 'undefined') {
        const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        console.log(`[createStory] Emitting storyCreated event via ${socketUrl}/api/socket/emit`);
        
        await fetch(`${socketUrl}/api/socket/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'storyCreated',
            data: { 
              storyId: story.id,
              userId: user_id,
              username: story.user.username,
              timestamp: new Date().toISOString()
            }
          }),
        }).then(response => {
          if (response.ok) {
            console.log('[createStory] Socket event emitted successfully');
          } else {
            console.error(`[createStory] Failed to emit socket event: ${response.status} ${response.statusText}`);
          }
        });
      }
    } catch (socketError) {
      console.error('[createStory] Socket error:', socketError);
      // Don't fail if socket emission fails
    }

    revalidatePath("/dashboard");
    return { success: true, story };
  } catch (error) {
    console.error("Create story error:", error);
    return { error: "Failed to create story" };
  }
}

export async function getNotifications() {
  try {
    const userId = await getUserId(3, 1000);

    if (!userId) {
      return { notifications: [], followRequests: [] };
    }

    const db = ensureDb();
    // First, get all notifications
    const notifications = await db.notification.findMany({
      where: {
        userId,
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
        story: {
          select: {
            id: true,
            fileUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const prisma = ensurePrisma();
    // Get pending follow requests
    const pendingFollowRequests = await prisma.follows.findMany({
      where: {
        followingId: userId,
        status: "PENDING",
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            image: true,
            isPrivate: true,
            followers: {
              where: {
                followingId: userId,
              },
              select: {
                status: true,
              },
            },
            following: {
              where: {
                followerId: userId,
              },
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert follow requests to notifications format
    const followRequestNotifications = pendingFollowRequests.map((request: {
      followerId: string;
      createdAt: Date;
      follower: {
        id: string;
        username: string | null;
        image: string | null;
        isPrivate: boolean;
        followers: { status: string }[];
        following: { status: string }[];
      };
    }) => {
      // Check if there's an existing notification for this follow request
      const existingNotification = notifications.find(
        (n: any) => n.type === "FOLLOW_REQUEST" && n.sender_id === request.followerId
      );

      // Create a consistent ID based on the follower and following IDs
      const consistentId = `follow-request-${request.followerId}-${userId}`;

      return {
        id: consistentId,
        type: "FOLLOW_REQUEST" as const,
        userId,
        sender_id: request.followerId,
        createdAt: request.createdAt,
        sender: {
          ...request.follower,
          isFollowing: request.follower.following.length > 0 && request.follower.following[0].status === "ACCEPTED",
          isFollowedByUser: request.follower.followers.length > 0 && request.follower.followers[0].status === "ACCEPTED",
          hasPendingRequest: true,
        },
        post: null,
        story: null,
        isRead: existingNotification?.isRead ?? false,
        reelId: null,
        storyId: null,
        metadata: null,
      };
    });

    // Return both regular notifications and follow requests
    return {
      notifications: [...notifications, ...followRequestNotifications],
      followRequests: followRequestNotifications,
    };
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    return { notifications: [], followRequests: [] };
  }
}

export async function likeComment(commentId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  try {
    const db = ensureDb();
    // Check if the like already exists
    const existingLike = await db.commentlike.findUnique({
      where: {
        commentId_user_id: {
          commentId,
          user_id: session.user.id,
        },
      },
    });

    // If like already exists, return early
    if (existingLike) {
      return { message: "Comment already liked" };
    }

    // Create the like if it doesn't exist
    const like = await db.commentlike.create({
      data: {
        id: crypto.randomUUID(),
        commentId,
        user_id: session.user.id,
        updatedAt: new Date(),
      },
      include: {
        comment: {
          include: {
            user: true,
            post: true,
          },
        },
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
    });

    // Create notification for comment owner if it's not the same user
    if (like.comment.user_id !== session.user.id) {
      // Find any existing comment like notification
      const existingNotification = await db.notification.findFirst({
        where: {
          type: "COMMENT_LIKE",
          userId: like.comment.user_id,
          postId: like.comment.postId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get count of other comment likes (excluding the current user)
      const otherLikes = await db.commentlike.count({
        where: {
          commentId,
          user_id: {
            not: session.user.id,
          },
        },
      });

      if (existingNotification) {
        // Update the existing notification with new sender and others count
        await db.notification.update({
          where: { id: existingNotification.id },
          data: {
            sender_id: session.user.id,
            createdAt: new Date(),
            metadata: JSON.stringify({ 
              othersCount: otherLikes,
              lastLikerId: session.user.id
            }),
          },
        });
      } else {
        // Create new notification if none exists
        await db.notification.create({
          data: {
            id: crypto.randomUUID(),
            type: "COMMENT_LIKE",
            userId: like.comment.user_id,
            sender_id: session.user.id,
            postId: like.comment.postId!,
            metadata: JSON.stringify({ 
              othersCount: otherLikes,
              lastLikerId: session.user.id
            }),
          },
        });
      }
    }

    // Make sure to revalidate all relevant paths
    if (like.comment.postId) {
      revalidatePath(`/dashboard/p/${like.comment.postId}`);
    }
    revalidatePath("/dashboard");
    return { message: "Liked comment", like };
  } catch (error) {
    console.error("Error liking comment:", error);
    throw new Error("Failed to like comment");
  }
}

export async function unlikeComment(commentId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  try {
    const db = ensureDb();
    // Check if the like exists
    const existingLike = await db.commentlike.findUnique({
      where: {
        commentId_user_id: {
          commentId,
          user_id: session.user.id,
        },
      },
      include: {
        comment: {
          select: {
            postId: true,
          },
        },
      },
    });

    // If like doesn't exist, return early
    if (!existingLike) {
      return { message: "Comment not liked" };
    }

    // Delete the like
    await db.commentlike.delete({
      where: {
        commentId_user_id: {
          commentId,
          user_id: session.user.id,
        },
      },
    });

    // Make sure to revalidate all relevant paths
    if (existingLike.comment.postId) {
      revalidatePath(`/dashboard/p/${existingLike.comment.postId}`);
    }
    revalidatePath("/dashboard");
    return { message: "Unliked comment" };
  } catch (error) {
    console.error("Error unliking comment:", error);
    throw new Error("Failed to unlike comment");
  }
}

export async function createEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const photo = formData.get("photo") as File;
  if (!photo) {
    throw new Error("Event photo is required");
  }

  // Upload photo to storage
  const photoUrl = await uploadFile(photo);

  // Get prizes from form data
  const prizesJson = formData.get("prizes") as string;
  const prizes = prizesJson ? JSON.parse(prizesJson) : [];

  const db = ensureDb();
  // Create event in database
  const event = await db.event.create({
    data: {
      id: crypto.randomUUID(),
      updatedAt: new Date(),
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      description: formData.get("description") as string,
      rules: formData.get("rules") as string,
      prize: prizes.length > 0 ? prizes[0] : null,
      prizes: prizes.length > 0 ? JSON.stringify(prizes) : null,
      location: formData.get("location") as string,
      startDate: new Date(formData.get("startDate") as string),
      photoUrl,
      user_id: session.user.id,
    },
  });

  // Get all users except the event creator
  const users = await db.user.findMany({
    where: {
      id: {
        not: session.user.id
      }
    },
    select: {
      id: true
    }
  });

  // Create notifications for all users
  await Promise.all(users.map((user: { id: string }) => 
    db.notification.create({
      data: {
        id: crypto.randomUUID(),
        type: "EVENT_CREATED",
        userId: user.id,
        sender_id: session.user.id,
        metadata: JSON.stringify({
          eventId: event.id,
          eventName: event.name
        }),
      },
    })
  ));

  return event;
}

export async function fetchEvents() {
  try {
    const db = ensureDb();
    const events = await db.event.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
      },
    });

    return events;
  } catch (error) {
    return [];
  }
}

export async function fetchEventById(id: string) {
  try {
    const prisma = ensurePrisma();
    const event = await prisma.event.findUnique({
      where: { id },
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
    });

    if (!event) return null;

    return {
      ...event,
      startDate: event.startDate.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
}

export async function deleteStory(storyId: string) {
  try {
    const user_id = await getUserId();
    
    if (!user_id) {
      throw new Error("Not authenticated");
    }

    const db = ensureDb();
    // Find the story and verify ownership
    const story = await db.story.findUnique({
      where: { id: storyId },
      select: { 
        user_id: true, 
        fileUrl: true 
      }
    });

    if (!story) {
      return { message: "Story not found" };
    }

    // Check if user is the owner of the story
    const isOwner = story.user_id === user_id;
    const isAdmin = (await auth())?.user?.role === "ADMIN" || (await auth())?.user?.role === "MASTER_ADMIN";
    
    if (!isOwner && !isAdmin) {
      throw new Error("Not authorized to delete this story");
    }

    // Delete the file from storage
    if (story.fileUrl) {
      try {
        await deleteUploadedFile(story.fileUrl);
      } catch (error) {
        console.error("Error deleting story file:", error);
        // Continue with story deletion even if file deletion fails
      }
    }

    // Count remaining stories before deletion for notification
    const remainingStoriesCount = await db.story.count({
      where: {
        user_id: story.user_id,
        id: { not: storyId },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    // Delete story views and likes
    await db.$transaction([
      db.storyview.deleteMany({
        where: { storyId }
      }),
      db.like.deleteMany({
        where: { storyId }
      }),
      db.notification.deleteMany({
        where: { storyId }
      }),
      db.storyreport.deleteMany({
        where: { storyId }
      }),
      db.story.delete({
        where: { id: storyId }
      })
    ]);

    // Emit socket event to notify clients about story deletion
    try {
      if (typeof window === 'undefined') {
        const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        console.log(`[deleteStory] Emitting storyDeleted event via ${socketUrl}/api/socket/emit`);
        
        await fetch(`${socketUrl}/api/socket/emit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'storyDeleted',
            data: { 
              storyId,
              userId: story.user_id,
              remainingStoriesCount
            }
          }),
        }).then(response => {
          if (response.ok) {
            console.log('[deleteStory] Socket event emitted successfully');
          } else {
            console.error(`[deleteStory] Failed to emit socket event: ${response.status} ${response.statusText}`);
          }
        });
      }
    } catch (socketError) {
      console.error('[deleteStory] Socket error:', socketError);
      // Don't fail if socket emission fails
    }

    revalidatePath("/dashboard");
    return { 
      message: "Story deleted successfully",
      storyId,
      userId: story.user_id,
      remainingStoriesCount
    };
  } catch (error) {
    console.error("Error deleting story:", error);
    throw error;
  }
}

export async function deleteProfilePhoto(imageUrl: string) {
  try {
    await deleteUploadedFile(imageUrl);
    return { success: true };
  } catch (error) {
    console.error("[DELETE_PROFILE_PHOTO] Error:", error);
    return { success: false, error: "Failed to delete profile photo" };
  }
}
