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

const followCooldowns = new Map<string, number>();
const FOLLOW_COOLDOWN_MS = 5000; // 5 seconds cooldown

// Initialize Prisma client
const prismaClient = new PrismaClient();

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

export type PostWithUser = {
  id: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;
  caption: string | null;
  fileUrl: string;
  aspectRatio: number;
  location: string | null;
  hideComments: boolean;
  user: {
    id: string;
    username: string;
  };
};

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

  // Verify the database connection is working
  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        username: true,
      },
    });

    if (!user?.username) {
      throw new Error("User not found");
    }

    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Failed to create post due to database error");
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
        id: true, 
        user_id: true,
        hideComments: true,
        createdAt: true,
        updatedAt: true,
        caption: true,
        fileUrl: true,
        aspectRatio: true,
        location: true,
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    }) as PostWithUser | null;

    if (!post) {
      throw new Error("Post not found");
    }

    // Allow deletion if user is post owner, MASTER_ADMIN, or ADMIN
    const isPostOwner = post.user_id === session.user.id;
    const isMasterAdmin = session.user.role === "MASTER_ADMIN";
    const isAdmin = session.user.role === "ADMIN";

    if (!isPostOwner && !isMasterAdmin && !isAdmin) {
      throw new Error("Not authorized to delete this post");
    }

    // Try to delete the file, but don't fail if it's already gone
    try {
      if (post.fileUrl) {
        await deleteUploadedFile(post.fileUrl);
      }
    } catch (error) {
      console.error("Error deleting file, continuing with post deletion:", error);
    }

    // Delete all related records in a transaction
    await db.$transaction(async (tx) => {
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
        // Separate parent and child comments
        const parentComments = comments.filter((c: { id: string; parentId: string | null }) => !c.parentId);
        const childComments = comments.filter((c: { id: string; parentId: string | null }) => c.parentId);
        
        // Get all comment IDs
        const allCommentIds = comments.map((c: { id: string }) => c.id);

        // Delete comment likes for all comments first
        await tx.commentlike.deleteMany({
          where: { commentId: { in: allCommentIds } }
        });
        
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
        users.map(user => 
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

export async function bookmarkPost(value: FormDataEntryValue | null) {
  const user_id = await getUserId();

  const validatedFields = BookmarkSchema.safeParse({ postId: value });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Bookmark Post.",
    };
  }

  const { postId } = validatedFields.data;

  const db = ensureDb();
  const post = await db.post.findUnique({
    where: {
      id: postId,
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
      postId: postId,
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
          postId,
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
    revalidatePath(`/dashboard/p/${postId}`);

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
      select: { 
        id: true, 
        user_id: true,
        hideComments: true 
      }
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // Check if comments are disabled for this post
    if (post.hideComments === true) {
      throw new Error("Comments are disabled for this post");
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
      global.io.emit("commentDelete", {
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

    // If updating image, delete old image if it exists
    if (image && image !== currentUser.image && currentUser.image) {
      try {
        await deleteUploadedFile(currentUser.image);
      } catch (error) {
        console.error("[UPDATE_PROFILE] Error deleting old image:", error);
      }
    }

    // If switching from private to public, delete all pending follow requests
    if (currentUser.isPrivate && isPrivate === false) {
      // Use a transaction to ensure all operations succeed or fail together
      await prisma.$transaction(async (tx) => {
        // Get all pending follow requests
        const pendingRequests = await tx.follows.findMany({
          where: {
            followingId: user_id,
            status: "PENDING"
          },
          select: {
            followerId: true
          }
        });

        // Delete all pending requests
        await tx.follows.deleteMany({
          where: {
            followingId: user_id,
            status: "PENDING"
          }
        });

        // Delete all follow request notifications
        await tx.notification.deleteMany({
          where: {
            type: "FOLLOW_REQUEST",
            OR: [
              // Delete notifications where the user is the receiver of the follow request
              {
                userId: user_id,
                sender_id: {
                  in: pendingRequests.map(request => request.followerId)
                }
              },
              // Delete notifications where the user is the sender of the follow request
              {
                userId: {
                  in: pendingRequests.map(request => request.followerId)
                },
                sender_id: user_id
              }
            ]
          }
        });
      });
    }

    // Prepare update data
    const updateData = {
      ...(name !== undefined && { name }),
      ...(image !== undefined && { image: image || undefined }),
      ...(bio !== undefined && { bio }),
      ...(isPrivate !== undefined && { isPrivate })
    };

    console.log("[UPDATE_PROFILE] Update data:", updateData);

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: {
          id: user_id,
        },
        data: updateData,
      });

      // Revalidate all profile-related paths
      revalidatePath("/dashboard");
    }

    console.log("[UPDATE_PROFILE] Profile updated successfully");
    return { message: "Profile updated successfully" };
  } catch (error) {
    console.error("[UPDATE_PROFILE] Error:", error);
    return { 
      message: "Failed to update profile",
      errors: {
        form: ["An unexpected error occurred. Please try again."]
      }
    };
  }
}

export async function followUser({
  followingId,
  action = "follow",
}: {
  followingId: string;
  action?: FollowAction;
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

      revalidateAllPaths();
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
      await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          type: "FOLLOW",
          userId: followerId,
          sender_id: followingId,
          createdAt: new Date(),
        },
      });

      revalidateAllPaths();
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

      revalidateAllPaths();
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
    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        type: targetUser.isPrivate ? "FOLLOW_REQUEST" : "FOLLOW",
        userId: followingId,
        sender_id: followerId,
        createdAt: new Date(),
      },
    });

    revalidateAllPaths();
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
        n => n.type === "FOLLOW_REQUEST" && n.sender_id === request.followerId
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
  await Promise.all(users.map(user => 
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
    console.error("Error fetching events:", error);
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
