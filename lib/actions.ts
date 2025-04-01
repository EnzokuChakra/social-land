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

const followCooldowns = new Map<string, number>();
const FOLLOW_COOLDOWN_MS = 5000; // 5 seconds cooldown

export async function createPost(values: z.infer<typeof CreatePost>) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

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
      throw new Error("Post not found");
    }

    if (post.user_id !== session.user.id) {
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
    await db.$transaction(async (tx: typeof db) => {
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
}: {
  type: "LIKE" | "COMMENT" | "FOLLOW" | "FOLLOW_REQUEST" | "COMMENT_REPLY";
  user_id: string;
  postId?: string;
  commentId?: string;
}) {
  const sender_id = await getUserId();

  if (sender_id === user_id) {
    return;
  }

  try {
    if (type === "LIKE" && postId) {
      // Find any existing like notification for this post
      const existingNotification = await prisma.notification.findFirst({
        where: {
          type: "LIKE",
          userId: user_id,
          postId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get count of other likes (excluding the current user)
      const otherLikes = await prisma.like.count({
        where: {
          postId,
          user_id: {
            not: sender_id,
          },
        },
      });

      if (existingNotification) {
        // Update the existing notification with new sender and others count
        await prisma.notification.update({
          where: { id: existingNotification.id },
          data: {
            sender_id,
            createdAt: new Date(),
            metadata: otherLikes > 0 ? JSON.stringify({ othersCount: otherLikes }) : null,
          },
        });
      } else {
        // Create new notification if none exists
        await prisma.notification.create({
          data: {
            id: crypto.randomUUID(),
            type,
            userId: user_id,
            sender_id,
            postId,
            metadata: otherLikes > 0 ? JSON.stringify({ othersCount: otherLikes }) : null,
          },
        });
      }
    } else if (type === "COMMENT" && postId) {
      // Find any existing comment notification for this post
      const existingNotification = await prisma.notification.findFirst({
        where: {
          type: "COMMENT",
          userId: user_id,
          postId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Get count of other comments (excluding the current user)
      const otherComments = await prisma.comment.count({
        where: {
          postId,
          user_id: {
            not: sender_id,
          },
          parentId: null, // Only count top-level comments
        },
      });

      if (existingNotification) {
        // Update the existing notification with new sender and others count
        await prisma.notification.update({
          where: { id: existingNotification.id },
          data: {
            sender_id,
            createdAt: new Date(),
            metadata: JSON.stringify({
              ...(commentId ? { commentId } : {}),
              ...(otherComments > 0 ? { othersCount: otherComments } : {}),
            }),
          },
        });
      } else {
        // Create new notification if none exists
        await prisma.notification.create({
          data: {
            id: crypto.randomUUID(),
            type,
            userId: user_id,
            sender_id,
            postId,
            metadata: JSON.stringify({
              ...(commentId ? { commentId } : {}),
              ...(otherComments > 0 ? { othersCount: otherComments } : {}),
            }),
          },
        });
      }
    } else {
      // For other notification types (FOLLOW, FOLLOW_REQUEST, COMMENT_REPLY)
      const data: any = {
        id: crypto.randomUUID(),
        type,
        userId: user_id,
        sender_id,
        postId,
      };

      if (commentId) {
        data.metadata = { commentId };
      }

      await prisma.notification.create({ data });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export async function likePost(value: z.infer<typeof LikeSchema>) {
  const user_id = await getUserId();

  const validatedFields = LikeSchema.safeParse(value);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Like Post.",
    };
  }

  const { postId } = validatedFields.data;
  try {
    const existingLike = await db.like.findUnique({
      where: {
        postId_user_id: {
          postId,
          user_id,
        },
      },
    });

    if (existingLike) {
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
                  password: true, // Note: Be cautious with this field
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
                      password: true, // Note: Be cautious with this field
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
                      password: true, // Note: Be cautious with this field
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
              user: true, // Includes all user fields by default
            },
          },
          savedBy: {
            include: {
              user: true, // Includes all user fields by default
            },
          },
        },
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
      return {
        message: "Post not found",
      };
    }

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
                password: true, // Note: Be cautious with this field
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
                    password: true, // Note: Be cautious with this field
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
                    password: true, // Note: Be cautious with this field
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
            user: true, // Includes all user fields by default
          },
        },
        savedBy: {
          include: {
            user: true, // Includes all user fields by default
          },
        },
      },
    });
    const likedBy = await db.user.findUnique({
      where: {
        id: user_id,
      },
    });
    revalidatePath("/dashboard");
    return {
      message: "Post liked successfully",
      post: updatedPost,
      unlike: false,
      likedBy,
    };
  } catch (error) {
    console.error("Error in likePost:", error);
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
  const validatedFields = CreateComment.safeParse(values);

  console.log("[CREATE_COMMENT] Received values:", values);

  if (!validatedFields.success) {
    console.error("[CREATE_COMMENT] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Comment.",
    };
  }

  const { postId, body, parentId } = validatedFields.data;
  console.log("[CREATE_COMMENT] Validated data:", { postId, body, parentId });

  try {
    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        user_id: true,
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    // If this is a reply, verify the parent comment exists
    if (parentId) {
      console.log("[CREATE_COMMENT] Verifying parent comment:", parentId);
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true }
      });

      if (!parentComment) {
        console.error("[CREATE_COMMENT] Parent comment not found");
        throw new Error("Parent comment not found");
      }

      if (parentComment.postId !== postId) {
        console.error("[CREATE_COMMENT] Parent comment belongs to different post");
        throw new Error("Invalid parent comment");
      }
      
      console.log("[CREATE_COMMENT] Parent comment verified");
    }

    const comment = await db.comment.create({
      data: {
        id: crypto.randomUUID(),
        body,
        postId,
        user_id: userId,
        parentId,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        replies: {
          include: {
            user: true
          }
        }
      },
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
          type: "COMMENT_REPLY",
          user_id: parentComment.user_id,
          postId: postId ?? undefined,
          commentId: comment.id,
        });
        console.log("[CREATE_COMMENT] Created reply notification");
      }
    } else if (post.user_id !== userId) {
      // Create notification for top-level comment
      await createNotification({
        type: "COMMENT",
        user_id: post.user_id,
        postId: postId ?? undefined,
        commentId: comment.id,
      });
      console.log("[CREATE_COMMENT] Created comment notification");
    }

    revalidatePath("/dashboard");
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
  const user_id = await getUserId();

  const { id } = DeleteComment.parse({
    id: formData.get("id"),
  });

  try {
    // Find the comment with its replies
    const comment = await db.comment.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        user_id: true,
        postId: true,
        replies: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    // Check authorization
    const post = comment.postId
      ? await db.post.findUnique({
          where: { id: comment.postId },
          select: { user_id: true },
        })
      : null;

    const canDelete = comment.user_id === user_id || post?.user_id === user_id;

    if (!canDelete) {
      throw new Error("Not authorized to delete comment");
    }

    // Log debug information
    console.log(
      `Attempting to delete comment ${id} with ${
        comment.replies?.length || 0
      } replies`
    );

    // Get all reply IDs to delete them later
    const replyIds = comment.replies?.map((reply: { id: string }) => reply.id) || [];

    // Delete all replies first (outside of transaction to avoid constraint issues)
    if (replyIds.length > 0) {
      console.log(`Deleting ${replyIds.length} replies...`);

      // Delete each reply one by one
      for (const replyId of replyIds) {
        try {
          await db.comment.delete({
            where: { id: replyId },
          });
        } catch (error) {
          console.error(`Failed to delete reply ${replyId}:`, error);
          // Continue with other replies
        }
      }

      console.log(`Replies deleted successfully`);
    }

    // Now delete the parent comment
    await db.comment.delete({
      where: { id },
    });

    console.log(`Successfully deleted comment ${id} and all its replies`);
    revalidatePath("/dashboard");
    return { message: "Deleted comment and all replies." };
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { message: "Database Error: Failed to Delete Comment." };
  }
}

export async function updatePost(values: z.infer<typeof UpdatePost>) {
  const user_id = await getUserId();

  const validatedFields = UpdatePost.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Post.",
    };
  }

  const { id, fileUrl, caption } = validatedFields.data;

  const post = await db.post.findUnique({
    where: {
      id,
      user_id,
    },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  try {
    await db.post.update({
      where: {
        id,
      },
      data: {
        fileUrl,
        caption,
      },
    });
  } catch (error) {
    return { message: "Database Error: Failed to Update Post." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateProfile(values: z.infer<typeof UpdateUser>) {
  const user_id = await getUserId();

  const validatedFields = UpdateUser.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Profile.",
    };
  }

  const { name, image, username, bio, isPrivate } = validatedFields.data;

  try {
    // Get current user data to check username change history
    const currentUser = await db.user.findUnique({
      where: { id: user_id },
      select: { 
        username: true,
        lastUsernameChange: true 
      }
    });

    if (!currentUser) {
      return { 
        message: "User not found",
        errors: {
          form: ["User not found"]
        }
      };
    }

    // Check if username is being changed
    if (username && username !== currentUser.username) {
      // Check if username is already taken by another user
      const existingUser = await db.user.findFirst({
        where: {
          username,
          NOT: {
            id: user_id
          }
        }
      });

      if (existingUser) {
        return { 
          message: "Username already exists",
          errors: {
            username: ["This username is already taken"]
          }
        };
      }

      // Check if 14 days have passed since last username change
      if (currentUser.lastUsernameChange) {
        const daysSinceLastChange = Math.floor(
          (Date.now() - currentUser.lastUsernameChange.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastChange < 14) {
          const daysLeft = 14 - daysSinceLastChange;
          return {
            message: `You can only change your username once every 14 days. Please wait ${daysLeft} more days.`,
            errors: {
              username: [`Please wait ${daysLeft} more days before changing your username again`]
            }
          };
        }
      }
    }

    // Update the user profile
    await db.user.update({
      where: {
        id: user_id,
      },
      data: {
        username,
        name,
        image,
        bio,
        isPrivate,
        // Update lastUsernameChange only if username is being changed
        ...(username && username !== currentUser.username && {
          lastUsernameChange: new Date()
        })
      },
    });

    // Revalidate all profile-related paths
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/${username}`);
    revalidatePath(`/dashboard/${username}/saved`);
    revalidatePath(`/dashboard/${username}/reels`);
    revalidatePath(`/dashboard/${username}/tagged`);

    return { message: "Updated Profile." };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { 
      message: "Database Error: Failed to Update Profile.",
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
    const followerId = await getUserId();

    if (!followerId) {
      return { error: "Not authenticated", status: "UNFOLLOWED" };
    }

    // Check cooldown for follow action
    if (action === "follow") {
      const cooldownKey = `${followerId}-${followingId}`;
      const lastFollowTime = followCooldowns.get(cooldownKey);
      const now = Date.now();

      if (lastFollowTime && now - lastFollowTime < FOLLOW_COOLDOWN_MS) {
        return { 
          error: "Please wait a few seconds before following again", 
          status: "UNFOLLOWED" 
        };
      }

      // Set cooldown
      followCooldowns.set(cooldownKey, now);
    }

    // Check if there's an existing follow relationship
    const existingFollow = await prisma.follows.findFirst({
      where: {
        followerId: action === "accept" ? followingId : followerId,
        followingId: action === "accept" ? followerId : followingId,
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
      if (!existingFollow || existingFollow.status !== "PENDING") {
        return {
          error: "No pending follow request found",
          status: "UNFOLLOWED",
        };
      }

      // Update the follow status to ACCEPTED
      await prisma.follows.update({
        where: {
          followerId_followingId: {
            followerId: followingId, // The person who sent the request
            followingId: followerId, // The current user accepting the request
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
      if (!existingFollow || existingFollow.status !== "PENDING") {
        return {
          error: "No pending follow request found",
          status: "UNFOLLOWED",
        };
      }

      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: followingId, // The person who sent the request
            followingId: followerId, // The current user deleting the request
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

    // Delete any existing follow notifications between these users
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

    // Create the follow relationship
    const newFollow = await prisma.follows.create({
      data: {
        followerId: followerId, // The person who is following (Tony)
        followingId: followingId, // The person being followed (Enzoku)
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
    console.error("Error in followUser:", error);
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
  const userId = await getUserId();

  if (!userId) {
    return { notifications: [] };
  }

  try {
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
            // Get followers (people who follow the sender)
            followers: {
              where: {
                followerId: userId,
              },
              select: {
                status: true,
              },
            },
            // Get following (people the sender follows)
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch comments for notifications that have commentId in metadata
    const commentIds = notifications
      .filter((n: { metadata: string | null }) => {
        if (!n.metadata) return false;
        try {
          const metadata = JSON.parse(n.metadata);
          return typeof metadata === 'object' && 'commentId' in metadata;
        } catch {
          return false;
        }
      })
      .map((n: { metadata: string | null }) => {
        try {
          const metadata = JSON.parse(n.metadata!);
          return metadata.commentId;
        } catch {
          return null;
        }
      })
      .filter((id: string | null): id is string => id !== null);

    const comments =
      commentIds.length > 0
        ? await db.comment.findMany({
            where: {
              id: {
                in: commentIds,
              },
            },
            select: {
              id: true,
              body: true,
            },
          })
        : [];

    const enrichedNotifications = notifications.map((notification: { 
      metadata: string | null;
      type: string;
      userId: string;
      sender_id: string;
      sender?: any;
    }) => {
      const commentId = notification.metadata
        ? (() => {
            try {
              const metadata = JSON.parse(notification.metadata);
              return typeof metadata === 'object' && 'commentId' in metadata
                ? String(metadata.commentId)
                : undefined;
            } catch {
              return undefined;
            }
          })()
        : undefined;

      // Get follow state from both followers and following arrays
      const followStatus = notification.sender?.followers[0]?.status;
      const followedByStatus = notification.sender?.following[0]?.status;

      // Update the logic to correctly determine follow states
      const isFollowing = followStatus === "ACCEPTED";
      const hasPendingRequest = followStatus === "PENDING";
      const isFollowedByUser = followedByStatus === "ACCEPTED";

      return {
        ...notification,
        type: notification.type as NotificationType,
        user_id: notification.userId,
        senderId: notification.sender_id,
        sender: notification.sender
          ? {
              ...notification.sender,
              isFollowing,
              hasPendingRequest,
              isFollowedByUser,
              followers: undefined, // Remove the followers array from the response
              following: undefined, // Remove the following array from the response
            }
          : undefined,
        comment: commentId
          ? {
              id: commentId,
              text: comments.find((c: { id: string; body: string }) => c.id === commentId)?.body || "",
            }
          : null,
      };
    });

    return { notifications: enrichedNotifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [] };
  }
}

export async function likeComment(commentId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  try {
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
      await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          type: "COMMENT_LIKE",
          userId: like.comment.user_id,
          sender_id: session.user.id,
          postId: like.comment.postId!,
        },
      });
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

  return event;
}

export async function fetchEvents() {
  try {
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
