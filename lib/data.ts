import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/utils";
import {
  UserWithExtras,
  PostWithExtras,
  StoryWithExtras,
  Story,
  User,
  Follows,
  ApiResponse,
  FollowerWithExtras,
  FollowingWithExtras,
  SavedPostWithExtras,
  UserRole,
  UserStatus,
  PostTag,
  Comment,
  Like,
  StoryView,
  SavedPost,
  Post,
  CommentWithExtras,
  EventWithUserData,
  UserWithFollows
} from "./definitions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

interface FollowerData {
  follower: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
  };
  followerId: string;
  followingId: string;
  status: string;
}

interface FollowingData {
  following: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: string;
    status: string;
  };
  followerId: string;
  followingId: string;
  status: string;
}

export async function fetchPosts(userId: string, page: number = 1, limit: number = 20) {
  noStore();

  try {
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return [];
    }

    // Use a type assertion to tell TypeScript that prisma is defined
    const db = prisma as NonNullable<typeof prisma>;

    // Get blocked users (both ways)
    const blockedUsers = await db.block.findMany({
      where: {
        blockerId: userId,
      },
      select: {
        blockedId: true,
      },
    }) ?? [];

    const blockedByUsers = await db.block.findMany({
      where: {
        blockedId: userId,
      },
      select: {
        blockerId: true,
      },
    }) ?? [];

    // Combine both lists for bidirectional blocking
    const blockedUserIds = [
      ...(blockedUsers || []).map((block: { blockedId: string }) => block.blockedId),
      ...(blockedByUsers || []).map((block: { blockerId: string }) => block.blockerId)
    ];

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    const posts = await db.post.findMany({
      where: {
        // Exclude posts from blocked users and users who have blocked the current user
        NOT: {
          user_id: {
            in: blockedUserIds,
          },
        },
      },
      include: {
        user: true,
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
                isPrivate: true,
                role: true,
                status: true
              }
            }
          }
        },
        savedBy: true,
        comments: {
          where: {
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
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  },
                  select: {
                    id: true
                  }
                }
              }
            },
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true
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
                    stories: {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                      },
                      select: {
                        id: true
                      }
                    }
                  }
                },
                likes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        image: true
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
          }
        },
        tags: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: limit
    }) ?? [];

    // Get total count for pagination
    const totalCount = await db.post.count({
      where: {
        NOT: {
          user_id: {
            in: blockedUserIds,
          },
        },
      }
    });

    // Get follow status for each user in likes array
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    // Get follow status for post owners
    const postOwnerFollows = await db.follows.findMany({
      where: {
        followerId: session.user.id,
        followingId: {
          in: posts.map((post: { user: { id: string } }) => post.user.id)
        }
      }
    });

    const postsWithFollowStatus = await Promise.all(
      posts.map(async (post: any) => {
        // Get follow status for post owner
        const postOwnerFollow = postOwnerFollows.find(
          (follow: { followingId: string }) => follow.followingId === post.user.id
        );

        // Get follow status for users in likes array
        const likesWithFollowStatus = await Promise.all(
          post.likes.map(async (like: any) => {
            if (!like.user) {
              return like;
            }
            
            const follow = await db.follows.findUnique({
              where: {
                followerId_followingId: {
                  followerId: session.user.id,
                  followingId: like.user.id
                }
              }
            });

            return {
              ...like,
              user: {
                ...like.user,
                isFollowing: follow?.status === "ACCEPTED" || false,
              }
            };
          })
        );

        return {
          ...post,
          likes: likesWithFollowStatus,
          user: {
            ...post.user,
            isFollowing: postOwnerFollow?.status === "ACCEPTED" || false,
            hasPendingRequest: postOwnerFollow?.status === "PENDING" || false
          }
        };
      })
    );

    return {
      posts: postsWithFollowStatus,
      hasMore: skip + limit < totalCount
    };
  } catch (error) {
    console.error("[fetchPosts] Error:", error);
    return {
      posts: [],
      hasMore: false
    };
  }
}

export async function fetchPostById(postId: string) {
  noStore();

  try {
    if (!prisma) {
      console.error("[fetchPostById] Prisma client is not initialized");
      throw new Error("Database connection error");
    }

    // Use a type assertion to tell TypeScript that prisma is defined
    const db = prisma as NonNullable<typeof prisma>;

    // First, check if the post exists without including the user
    const postExists = await db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        user_id: true,
      }
    });

    if (!postExists) {
      return null;
    }

    // Now check if the user exists
    const userExists = await db.user.findUnique({
      where: {
        id: postExists.user_id,
      },
      select: {
        id: true,
      }
    });

    if (!userExists) {
      return null;
    }

    // Now fetch the full post with all relations
    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            bio: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            stories: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              },
              select: {
                id: true
              }
            }
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true,
                isPrivate: true
              }
            }
          }
        },
        comments: {
          where: {
            parentId: null // Only fetch top-level comments
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                verified: true,
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  },
                  select: {
                    id: true
                  }
                }
              }
            },
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true
                  }
                }
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    verified: true,
                    stories: {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                      },
                      select: {
                        id: true
                      }
                    }
                  }
                },
                likes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        image: true
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
          take: 10 // Limit initial comments to 10
        },
        savedBy: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true
              }
            }
          }
        },
        tags: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      return null;
    }

    // Get total comment count
    const totalComments = await db.comment.count({
      where: {
        postId: postId,
        parentId: null // Only count top-level comments
      }
    });

    // Get follow status for each user in likes array
    const session = await auth();
    if (!session?.user?.id) {
      // Instead of throwing an error, return a post with limited information
      return {
        ...post,
        likes: post.likes.map((like: any) => ({
          ...like,
          user: like.user ? {
            ...like.user,
            isFollowing: false,
            hasPendingRequest: false
          } : null
        })),
        user: {
          ...post.user,
          hasActiveStory: (post.user as any).stories && (post.user as any).stories.length > 0,
          isFollowing: false,
          hasPendingRequest: false
        },
        hasMore: totalComments ? totalComments > post.comments.length : false,
        totalComments: totalComments || 0
      };
    }

    // Get follow status for post owner
    const postOwnerFollow = await db.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: post.user.id
        }
      }
    });

    const likesWithFollowStatus = await Promise.all(
      post.likes.map(async (like: any) => {
        if (!like.user) {
          return like;
        }
        
        const follow = await db.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: like.user.id
            }
          }
        });

        return {
          ...like,
          user: {
            ...like.user,
            isFollowing: follow?.status === "ACCEPTED" || false,
            hasPendingRequest: follow?.status === "PENDING" || false,
            isPrivate: like.user.isPrivate || false
          }
        };
      })
    );

    // Transform the post to include hasActiveStory and totalComments
    const transformedPost = {
      ...post,
      likes: likesWithFollowStatus,
      user: {
        ...post.user,
        hasActiveStory: (post.user as any).stories && (post.user as any).stories.length > 0,
        isFollowing: postOwnerFollow?.status === "ACCEPTED" || false,
        hasPendingRequest: postOwnerFollow?.status === "PENDING" || false
      },
      hasMore: totalComments ? totalComments > post.comments.length : false,
      totalComments: totalComments || 0
    };

    return transformedPost;
  } catch (error) {
    console.error("[fetchPostById] Error fetching post:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`[fetchPostById] Error name: ${error.name}`);
      console.error(`[fetchPostById] Error message: ${error.message}`);
      console.error(`[fetchPostById] Error stack: ${error.stack}`);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function fetchPostsByUsername(username: string, postId?: string) {
  noStore();

  try {
    const data = await prisma?.post.findMany({
      where: {
        user: {
          username,
        },
        NOT: {
          id: postId,
        },
      },
      include: {
        comments: {
          where: {
            parentId: null // Only fetch top-level comments
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true,
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  },
                  select: {
                    id: true
                  }
                }
              }
            },
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true
                  }
                }
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true,
                    stories: {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                      },
                      select: {
                        id: true
                      }
                    }
                  }
                },
                likes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        image: true,
                        name: true,
                        verified: true
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
          }
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true
              }
            }
          }
        },
        savedBy: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
            verified: true,
            stories: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              },
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Transform the data to include hasActiveStory and handle nested comments
    const transformedData = (data || []).map((post: any) => ({
      ...post,
      user: {
        ...post.user,
        hasActiveStory: (post.user as any).stories && (post.user as any).stories.length > 0,
        stories: undefined
      },
      comments: post.comments.map((comment: any) => ({
        ...comment,
        user: {
          ...comment.user,
          hasActiveStory: (comment.user as any).stories && (comment.user as any).stories.length > 0,
          stories: undefined
        },
        replies: comment.replies?.map((reply: any) => ({
          ...reply,
          user: {
            ...reply.user,
            hasActiveStory: (reply.user as any).stories && (reply.user as any).stories.length > 0,
            stories: undefined
          }
        }))
      }))
    }));

    return transformedData;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function fetchProfile(username: string) {
  if (!prisma) {
    console.error("Prisma client is not initialized");
    return null;
  }

  try {
    const result = await prisma.user.findUnique({
      where: {
        username: username,
      },
      include: {
        // For followers (people who follow this user)
        followers: {
          select: {
            follower: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
                isPrivate: true,
                role: true,
                status: true
              }
            },
            status: true,
            createdAt: true
          },
          where: {
            follower: {  // Ensure follower relation exists
              NOT: undefined
            }
          }
        },
        // For following (people this user follows)
        following: {
          select: {
            following: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
                isPrivate: true,
                role: true,
                status: true
              }
            },
            status: true,
            createdAt: true
          },
          where: {
            following: {  // Ensure following relation exists
              NOT: undefined
            }
          }
        },
        posts: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true,
                isPrivate: true,
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  }
                }
              }
            },
            likes: true,
            savedBy: true,
            comments: {
              where: {
                parentId: null
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true,
                    isPrivate: true
                  }
                }
              }
            }
          }
        },
        savedPosts: {
          include: {
            post: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true,
                    verified: true,
                    isPrivate: true,
                    stories: {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                      }
                    }
                  }
                },
                comments: {
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
                },
                likes: true,
                savedBy: true,
                tags: true
              }
            }
          }
        }
      }
    });

    return result;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
}

export async function fetchSavedPostsByUsername(username: string) {
  noStore();

  try {
    const data = await prisma?.savedpost.findMany({
      where: {
        user: {
          username,
        },
      },
      include: {
        post: {
          include: {
            comments: {
              where: {
                parentId: null // Only fetch top-level comments
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true,
                    stories: {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                      },
                      select: {
                        id: true
                      }
                    }
                  }
                },
                likes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        image: true,
                        name: true,
                        verified: true
                      }
                    }
                  }
                },
                replies: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        image: true,
                        name: true,
                        verified: true,
                        stories: {
                          where: {
                            createdAt: {
                              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                            }
                          },
                          select: {
                            id: true
                          }
                        }
                      }
                    },
                    likes: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            username: true,
                            image: true,
                            name: true,
                            verified: true
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
              }
            },
            likes: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true
                  }
                }
              }
            },
            savedBy: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true
                  }
                }
              }
            },
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true,
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  },
                  select: {
                    id: true
                  }
                }
              }
            },
            tags: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true,
                    verified: true
                  }
                }
              }
            }
          }
        },
        user: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch saved posts");
  }
}

export async function fetchSuggestedUsers(userId: string | undefined, limit: number = 5) {
  noStore();

  try {
    if (!userId) return [];

    // First, get all users that have any kind of follow relationship with the current user
    const followRelationships = await prisma?.follows.findMany({
      where: {
        OR: [
          { followerId: userId },
          { followingId: userId }
        ]
      },
      select: {
        followerId: true,
        followingId: true
      }
    });

    // Get blocked users (both ways)
    const blockedUsers = await prisma?.block.findMany({
      where: {
        OR: [
          { blockerId: userId }, // Users that the current user has blocked
          { blockedId: userId }  // Users that have blocked the current user
        ]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    });

    // Extract all user IDs that have any kind of relationship and add the current user
    const excludeUserIds = new Set([
      userId, // Explicitly add current user to exclusion list
      ...(followRelationships || []).map((rel: { followerId: string; followingId: string }) => rel.followerId),
      ...(followRelationships || []).map((rel: { followerId: string; followingId: string }) => rel.followingId),
      ...(blockedUsers || []).map((block: { blockerId: string; blockedId: string }) => block.blockerId),
      ...(blockedUsers || []).map((block: { blockerId: string; blockedId: string }) => block.blockedId)
    ]);

    // Get users that have no follow relationship with the current user
    const suggestedUsers = await prisma?.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: userId, // Redundant but keeping for safety
              notIn: Array.from(excludeUserIds)
            }
          },
          {
            status: {
              not: "BANNED"
            }
          }
        ]
      },
      include: {
        followers: {
          where: {
            status: "ACCEPTED"
          }
        },
        following: {
          where: {
            status: "ACCEPTED"
          }
        }
      },
      take: limit,
      orderBy: {
        followers: {
          _count: 'desc'
        }
      }
    });

    return suggestedUsers || [];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch suggested users");
  }
}

export async function fetchNotifications(userId: string) {
  noStore();

  try {
    const notifications = await prisma?.notification.findMany({
      where: {
        userId: userId,
      },
      include: {
        user: true,
        sender: true,
        post: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return notifications || [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function fetchUserStories(userId: string) {
  try {
    noStore();

    if (!userId) {
      console.error("[FETCH_USER_STORIES] No userId provided");
      return [];
    }

    const userExists = await prisma?.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      console.error("[FETCH_USER_STORIES] User not found:", userId);
      return [];
    }

    const stories = await prisma?.story.findMany({
      where: {
        user_id: userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true
          }
        },
        likes: {
          include: {
            user: true
          }
        },
        views: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return stories || [];
  } catch (error) {
    console.error("[FETCH_USER_STORIES_ERROR]", error);
    return [];
  }
}

export async function fetchOtherStories(currentUserId?: string) {
  noStore();

  try {
    if (!currentUserId) {
      console.log("No currentUserId provided to fetchOtherStories");
      return [];
    }

    // Get blocked users (both ways)
    const blockedUsers = await prisma?.block.findMany({
      where: {
        OR: [
          { blockerId: currentUserId }, // Users that the current user has blocked
          { blockedId: currentUserId }  // Users that have blocked the current user
        ]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    });

    // Extract all blocked user IDs
    const blockedUserIds = new Set([
      ...(blockedUsers || []).map((block: { blockerId: string; blockedId: string }) => block.blockerId),
      ...(blockedUsers || []).map((block: { blockerId: string; blockedId: string }) => block.blockedId)
    ]);
    
    // Remove the current user from the blocked list if it was added
    blockedUserIds.delete(currentUserId);

    // Get users that the current user follows
    const following = await prisma?.follows.findMany({
      where: {
        followerId: currentUserId,
        status: "accepted"
      },
      select: {
        followingId: true
      }
    });

    const followingIds = following?.map((f: { followingId: string }) => f.followingId) || [];
    
    // Filter out blocked users from the following list
    const filteredFollowingIds = followingIds.filter((id: string) => !blockedUserIds.has(id));

    // Get stories from followed users from the last 24 hours
    const stories = await prisma?.story.findMany({
      where: {
        user_id: {
          in: filteredFollowingIds
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        user: true,
        likes: {
          include: {
            user: true
          }
        },
        views: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return stories || [];
  } catch (error) {
    console.error("[FETCH_OTHER_STORIES]", error);
    return [];
  }
}

export async function fetchStoriesByUserId(userId: string) {
  noStore();

  try {
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return [];
    }

    const stories = await prisma.story.findMany({
      where: {
        user_id: userId,
      },
      include: {
        user: true,
        likes: {
          include: {
            user: true,
          },
        },
        views: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return stories || [];
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch stories");
  }
}

export async function fetchSavedPosts(userId: string) {
  noStore();

  try {
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return [];
    }

    console.log(`[DEBUG] Fetching saved posts for user: ${userId}`);

    // First get all saved posts
    const data = await prisma.savedpost.findMany({
      where: {
        user_id: userId,
      },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true,
                isPrivate: true,
                isFollowing: true,
                hasPendingRequest: true,
                isFollowedByUser: true,
                stories: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                  },
                  select: {
                    id: true
                  }
                }
              }
            },
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    verified: true,
                    role: true
                  }
                }
              },
              orderBy: {
                createdAt: "desc",
              },
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
                  },
                },
              },
            },
            savedBy: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
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

    console.log(`[DEBUG] Found ${data.length} total saved posts`);

    // Get all accounts the user follows
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
        status: "ACCEPTED"
      },
      select: {
        followingId: true
      }
    });

    const followingIds = new Set(following.map((f: { followingId: string }) => f.followingId));
    console.log(`[DEBUG] User follows ${followingIds.size} accounts`);

    // Filter out saved posts from private accounts that the user no longer follows
    const filteredData = data.filter((savedPost: { 
      post: { 
        user: { 
          isPrivate: boolean; 
          id: string; 
          username: string;
          name: string | null;
          image: string | null;
          verified: boolean;
          isFollowing: boolean;
          hasPendingRequest: boolean;
          isFollowedByUser: boolean;
        } | null 
      } | null 
    }) => {
      const post = savedPost.post;
      if (!post || !post.user) {
        console.log(`[DEBUG] Found saved post with no post data or user data`);
        return false;
      }
      
      const isPrivate = post.user.isPrivate;
      const isFollowing = followingIds.has(post.user.id);
      
      console.log(`[DEBUG] Post from user ${post.user.username} (${post.user.id}):`);
      console.log(`[DEBUG] - Is private: ${isPrivate}`);
      console.log(`[DEBUG] - Is following: ${isFollowing}`);
      
      // If the post is from a private account and user doesn't follow them, exclude it
      if (isPrivate && !isFollowing) {
        console.log(`[DEBUG] - Filtering out post from private account not being followed`);
        return false;
      }
      
      return true;
    });

    console.log(`[DEBUG] After filtering: ${filteredData.length} posts remain`);
    return filteredData;
  } catch (error) {
    console.error("[DEBUG] Error fetching saved posts:", error);
    return [];
  }
}

export async function getReelsEnabled() {
  try {
    const setting = await prisma?.setting.findFirst({
      where: {
        key: 'reelsEnabled'
      }
    });
    return setting?.value === 'true';
  } catch (error) {
    console.error('Error fetching reels setting:', error);
    return false; // Default to false if there's an error
  }
}

export async function fetchRankedExplorePosts(userId: string, page: number = 1, limit: number = 24) {
  noStore();

  try {
    // Get blocked users (both ways)
    const blockedUsers = await prisma?.block.findMany({
      where: {
        OR: [
          { blockerId: userId }, // Users that the current user has blocked
          { blockedId: userId }  // Users that have blocked the current user
        ]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    });

    // Combine both lists to create a comprehensive list of blocked user IDs
    const blockedUserIds = [
      ...(blockedUsers || []).map((block: { blockerId: string; blockedId: string }) => block.blockerId),
      ...(blockedUsers || []).map((block: { blockerId: string; blockedId: string }) => block.blockedId)
    ].filter(id => id !== userId); // Remove current user from the list if present

    // Calculate the start of the current day (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const skip = (page - 1) * limit;

    // Get total count of available posts
    const totalCount = await prisma?.post.count({
      where: {
        user: {
          isPrivate: false,
          id: {
            notIn: blockedUserIds
          }
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Calculate the maximum number of posts we can fetch (capped at 100)
    const maxPosts = Math.min(totalCount || 0, 100);
    const adjustedLimit = Math.min(limit, maxPosts - skip);

    // If we've reached the maximum number of posts, return empty
    if (adjustedLimit <= 0) {
      return {
        posts: [],
        hasMore: false,
        page
      };
    }

    // Fetch posts with their like counts for today
    const posts = await prisma?.post.findMany({
      where: {
        user: {
          isPrivate: false, // Only show posts from public accounts
          id: {
            notIn: blockedUserIds // Exclude posts from blocked users
          }
        },
        // Only include posts from the last 30 days to keep the explore page fresh
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: [
        {
          likes: {
            _count: 'desc'
          }
        },
        {
          createdAt: 'desc'
        }
      ],
      skip,
      take: adjustedLimit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true,
            stories: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              },
              select: {
                id: true
              }
            }
          }
        },
        likes: {
          where: {
            user_id: userId
          },
          select: {
            id: true
          }
        },
        savedBy: {
          where: {
            user_id: userId
          },
          select: {
            id: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        tags: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
                verified: true
              }
            }
          }
        }
      }
    });

    // Transform posts to include hasActiveStory
    const transformedPosts = (posts || []).map((post: any) => ({
      ...post,
      user: {
        ...post.user,
        hasActiveStory: (post.user as any).stories && (post.user as any).stories.length > 0,
        stories: undefined // Remove stories from the response
      }
    }));

    const hasMore = skip + adjustedLimit < maxPosts;

    return {
      posts: transformedPosts,
      hasMore,
      page
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch explore posts");
  }
}

export async function getUserActivity(userId: string) {
  try {
    const [likes, comments, savedPosts] = await Promise.all([
      // Get user's likes with post details
      prisma?.like.findMany({
        where: {
          user_id: userId,
          postId: { not: null }
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
      prisma?.comment.findMany({
        where: {
          user_id: userId,
          postId: { not: null }
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
      prisma?.savedpost.findMany({
        where: {
          user_id: userId
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

    return {
      likes: likes || [],
      comments: comments || [],
      savedPosts: savedPosts || []
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw new Error('Failed to fetch user activity');
  }
}

export async function fetchEventById(id: string) {
  noStore();

  try {
    const event = await prisma?.event.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            verified: true,
            email: true,
            password: true,
            bio: true,
            isPrivate: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Transform the event to match our interface
    const transformedEvent: EventWithUserData = {
      ...event,
      userId: event.user_id,
      prize: event.rules ? JSON.parse(event.rules) : null,
      user: {
        ...event.user,
        role: event.user.role as UserRole,
        status: event.user.status as UserStatus
      }
    };

    return transformedEvent;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch event");
  }
}
