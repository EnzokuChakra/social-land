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
  EventWithUserData
} from "./definitions";
import { auth } from "@/lib/auth";

export async function fetchPosts(userId?: string) {
  // equivalent to doing fetch, cache: no-store
  noStore();

  try {
    const posts = await prisma.post.findMany({
      where: {
        user_id: userId,
        user: {
          status: {
            not: "BANNED"
          }
        }
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
                password: true
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
                    password: true
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
                    password: true
                  }
                }
              }
            }
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the posts to ensure all comments have user data
    const transformedPosts = posts.map((post: PostWithExtras) => ({
      ...post,
      comments: post.comments.map((comment: CommentWithExtras) => ({
        ...comment,
        user: comment.user || {
          id: 'deleted',
          username: 'deleted',
          name: 'Deleted User',
          image: null,
          verified: false,
          email: null,
          bio: null,
          isPrivate: false,
          role: 'USER' as UserRole,
          status: 'NORMAL' as UserStatus,
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        replies: comment.replies?.map((reply: CommentWithExtras) => ({
          ...reply,
          user: reply.user || {
            id: 'deleted',
            username: 'deleted',
            name: 'Deleted User',
            image: null,
            verified: false,
            email: null,
            bio: null,
            isPrivate: false,
            role: 'USER' as UserRole,
            status: 'NORMAL' as UserStatus,
            password: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }))
      }))
    }));

    return transformedPosts;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function fetchPostById(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
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
            replies: {
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
              },
              orderBy: {
                createdAt: "asc",
              },
            },
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
                isPrivate: true,
                followers: {
                  where: {
                    followerId: session.user.id,
                  },
                  select: {
                    status: true,
                  }
                },
                following: {
                  where: {
                    followingId: session.user.id,
                  },
                  select: {
                    status: true,
                  }
                }
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
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            verified: true,
            isPrivate: true,
          },
        },
        tags: {
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
    });

    if (!post) {
      return null;
    }

    // Transform the likes to include following status
    const transformedPost = {
      ...post,
      likes: post.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          isFollowing: like.user.followers[0]?.status === "ACCEPTED",
          hasPendingRequest: like.user.followers[0]?.status === "PENDING",
          isFollowedByUser: like.user.following[0]?.status === "ACCEPTED",
          followers: undefined, // Remove the followers array as we've extracted the status
          following: undefined // Remove the following array as we've extracted the status
        }
      }))
    };

    return transformedPost;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch post");
  }
}

export async function fetchPostsByUsername(username: string, postId?: string) {
  noStore();

  try {
    const data = await prisma.post.findMany({
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
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true,
              },
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
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
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
                username: true,
                image: true,
                name: true,
                verified: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
            verified: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function fetchProfile(username: string): Promise<UserWithExtras | null> {
  noStore();

  try {
    console.log('[FETCH_PROFILE_START]', {
      username,
      timestamp: new Date().toISOString()
    });

    const session = await auth();
    const userId = session?.user?.id;

    if (!username) {
      console.error('[FETCH_PROFILE_ERROR]', {
        error: 'Username is required',
        timestamp: new Date().toISOString()
      });
      return null;
    }

    // First get the user profile
    const profile = await prisma.user.findUnique({
      where: { username },
      include: {
        // Get user's own posts
        posts: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
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
                    password: true
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
                        password: true
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
                        password: true
                      }
                    }
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
                    password: true
                  },
                },
              },
            },
            savedBy: {
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
                    password: true
                  },
                },
              },
            },
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
                password: true
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
          },
        },
        // Get user's saved posts
        savedPosts: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            post: {
              include: {
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
                        password: true
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
                        password: true
                      },
                    },
                  },
                },
                savedBy: {
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
                        password: true
                      },
                    },
                  },
                },
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
                    password: true
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      console.error('[FETCH_PROFILE_ERROR]', {
        error: 'Profile not found',
        username,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    // Get posts where the user is tagged
    const [taggedPosts, followers, following] = await Promise.allSettled([
      prisma.post.findMany({
        where: {
          tags: {
            some: {
              userId: profile.id
            }
          },
          user_id: {
            not: profile.id
          }
        },
        include: {
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
                  password: true
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
                      password: true
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
                      password: true
                    }
                  }
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
                  password: true
                },
              },
            },
          },
          savedBy: {
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
                  password: true
                },
              },
            },
          },
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
              password: true
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
        },
      }),
      // Get followers
      prisma.follows.findMany({
        where: {
          followingId: profile.id,
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              verified: true,
              isPrivate: true,
            },
          },
        },
      }),
      // Get following
      prisma.follows.findMany({
        where: {
          followerId: profile.id,
        },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              verified: true,
              isPrivate: true,
            },
          },
        },
      }),
    ]);

    // Handle potential failures in parallel queries
    const taggedPostsResult = taggedPosts.status === 'fulfilled' ? taggedPosts.value : [];
    const followersResult = followers.status === 'fulfilled' ? followers.value : [];
    const followingResult = following.status === 'fulfilled' ? following.value : [];

    // Get follow counts with error handling
    const [followersCount, followingCount] = await Promise.allSettled([
      prisma.follows.count({
        where: {
          followingId: profile.id,
          status: "ACCEPTED",
        },
      }),
      prisma.follows.count({
        where: {
          followerId: profile.id,
          status: "ACCEPTED",
        },
      }),
    ]).then(results => results.map(result => 
      result.status === 'fulfilled' ? result.value : 0
    ));

    // Get follow status if logged in user is viewing another profile
    let followStatus = null;
    if (userId && userId !== profile.id) {
      try {
        const follow = await prisma.follows.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: profile.id,
            },
          },
          select: {
            status: true,
          },
        });
        followStatus = follow?.status || null;
      } catch (error) {
        console.error('[FETCH_PROFILE_FOLLOW_STATUS_ERROR]', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error),
          userId,
          profileId: profile.id,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Transform followers and following data with error handling
    const transformedFollowers = followersResult.map((f: FollowerWithExtras) => ({
      ...f,
      uniqueId: `${f.followerId}-${f.followingId}`,
    }));

    const transformedFollowing = followingResult.map((f: FollowingWithExtras) => ({
      ...f,
      uniqueId: `${f.followerId}-${f.followingId}`,
    }));

    // Ensure all posts have a tags array
    const postsWithTags = profile.posts.map((post: PostWithExtras) => ({
      ...post,
      tags: post.tags || []
    }));

    // Ensure all tagged posts have a tags array
    const taggedPostsWithTags = taggedPostsResult.map((post: PostWithExtras) => ({
      ...post,
      tags: post.tags || []
    }));

    // Merge tagged posts with profile posts
    profile.posts = [...postsWithTags, ...taggedPostsWithTags];

    console.log('[FETCH_PROFILE_SUCCESS]', {
      username,
      postsCount: profile.posts.length,
      followersCount,
      followingCount,
      timestamp: new Date().toISOString()
    });

    return {
      ...profile,
      followers: transformedFollowers,
      following: transformedFollowing,
      followersCount,
      followingCount,
      followStatus,
    };
  } catch (error) {
    console.error('[FETCH_PROFILE_ERROR]', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      username,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

export async function fetchSavedPostsByUsername(username: string) {
  noStore();

  try {
    const data = await prisma.savedPost.findMany({
      where: {
        user: {
          username,
        },
      },
      include: {
        post: {
          include: {
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    name: true,
                    verified: true,
                  },
                },
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
                    username: true,
                    image: true,
                    name: true,
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
                    username: true,
                    image: true,
                    name: true,
                    verified: true,
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch saved posts");
  }
}

export async function fetchSuggestedUsers(userId: string | undefined) {
  noStore();

  try {
    if (!userId) return [];

    // First, get all users that have any kind of follow relationship with the current user
    const followRelationships = await prisma.follows.findMany({
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

    // Extract all user IDs that have any kind of relationship
    const excludeUserIds = new Set([
      ...followRelationships.map((rel: { followerId: string; followingId: string }) => rel.followerId),
      ...followRelationships.map((rel: { followerId: string; followingId: string }) => rel.followingId)
    ]);

    // Get users that have no follow relationship with the current user
    const suggestedUsers = await prisma.user.findMany({
      where: {
        AND: [
          {
            id: {
              not: userId,
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
      take: 5,
      orderBy: {
        followers: {
          _count: 'desc'
        }
      }
    });

    return suggestedUsers;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch suggested users");
  }
}

export async function fetchNotifications(userId: string) {
  noStore();

  try {
    const notifications = await prisma.notification.findMany({
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

    return notifications;
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

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      console.error("[FETCH_USER_STORIES] User not found:", userId);
      return [];
    }

    const stories = await prisma.story.findMany({
      where: {
        user_id: userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
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
        createdAt: "desc",
      },
    });

    return stories;
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

    // Get users that the current user follows
    const following = await prisma.follows.findMany({
      where: {
        followerId: currentUserId,
        status: "accepted"
      },
      select: {
        followingId: true
      }
    });

    const followingIds = following.map((f: { followingId: string }) => f.followingId);

    // Get stories from followed users from the last 24 hours
    const stories = await prisma.story.findMany({
      where: {
        user_id: {
          in: followingIds
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

    return stories;
  } catch (error) {
    console.error("[FETCH_OTHER_STORIES]", error);
    return [];
  }
}

export async function fetchStoriesByUserId(userId: string) {
  noStore();

  try {
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

    return stories;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch stories");
  }
}

export async function fetchSavedPosts(userId: string) {
  noStore();

  try {
    const data = await prisma.savedPost.findMany({
      where: {
        user_id: userId,
      },
      include: {
        post: {
          include: {
            comments: {
              include: {
                user: true,
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
            user: true,
          },
        },
        user: {
          include: {
            followers: true,
            following: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return data;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch saved posts");
  }
}

export async function getReelsEnabled() {
  try {
    const setting = await prisma.setting.findFirst({
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
    // Calculate the start of the current day (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const skip = (page - 1) * limit;

    // Fetch posts with their like counts for today
    const posts = await prisma.post.findMany({
      where: {
        user: {
          isPrivate: false // Only show posts from public accounts
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
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            verified: true
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
        }
      }
    });

    // Get total count for pagination
    const total = await prisma.post.count({
      where: {
        user: {
          isPrivate: false
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      posts,
      hasMore: skip + limit < total,
      page
    };
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch ranked explore posts");
  }
}

export async function getUserActivity(userId: string) {
  try {
    const [likes, comments, savedPosts] = await Promise.all([
      // Get user's likes with post details
      prisma.like.findMany({
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
      prisma.comment.findMany({
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
      prisma.savedPost.findMany({
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
      likes,
      comments,
      savedPosts
    };
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw new Error('Failed to fetch user activity');
  }
}

const transformFollowing = (following: Follows & {
  following: User;
  follower: User;
}) => {
  return {
    ...following.following,
    followingId: following.followingId,
    followerId: following.followerId,
    status: following.status,
  };
};

const transformFollower = (follower: Follows & {
  following: User;
  follower: User;
}) => {
  return {
    ...follower.follower,
    followingId: follower.followingId,
    followerId: follower.followerId,
    status: follower.status,
  };
};

export async function fetchEventById(id: string) {
  noStore();

  try {
    const event = await prisma.event.findUnique({
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
      user: event.user,
    };

    return transformedEvent;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch event");
  }
}
