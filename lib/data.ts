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
import { PrismaClient } from "@prisma/client";

// Helper function to ensure prisma is available
function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma client is not initialized');
  }
  return prisma;
}

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

// Helper function to transform a user to match the User type
function transformUser(user: any): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email || '',
    username: user.username,
    password: user.password || '',
    image: user.image,
    bio: user.bio || '',
    verified: user.verified || false,
    isPrivate: user.isPrivate || false,
    role: user.role || 'USER',
    status: user.status || 'NORMAL',
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
    stories: user.stories || [],
    hasActiveStory: user.hasActiveStory || false
  };
}

// Helper function to transform a comment to match CommentWithExtras type
function transformComment(comment: any): CommentWithExtras {
  return {
    ...comment,
    user: {
      ...transformUser(comment.user),
      isFollowing: false,
      isPrivate: comment.user.isPrivate || false,
      hasPendingRequest: false,
      isFollowedByUser: false,
      hasActiveStory: false
    },
    likes: comment.likes?.map((like: any) => ({
      id: like.id,
      createdAt: like.createdAt,
      updatedAt: like.updatedAt,
      commentId: like.commentId,
      user_id: like.user_id,
      user: transformUser(like.user)
    })) || [],
    replies: comment.replies?.map((reply: any) => transformComment(reply)) || [],
    parentId: comment.parentId || null
  };
}

// Helper function to transform a post tag to match PostTag type
function transformPostTag(tag: any): PostTag {
  return {
    id: tag.id,
    postId: tag.postId,
    userId: tag.userId,
    x: tag.x || null,
    y: tag.y || null,
    createdAt: tag.createdAt,
    user: transformUser(tag.user)
  };
}

// Helper function to transform a post to match PostWithExtras type
function transformPost(post: any): PostWithExtras {
  const basePost: Post = {
    id: post.id,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    caption: post.caption,
    location: post.location,
    fileUrl: post.fileUrl,
    aspectRatio: post.aspectRatio,
    user_id: post.user_id
  };

  const transformedUser: User & {
    isFollowing?: boolean;
    isPrivate?: boolean;
    hasPendingRequest?: boolean;
    isFollowedByUser?: boolean;
    hasActiveStory?: boolean;
  } = {
    ...transformUser(post.user),
    isFollowing: false,
    isPrivate: post.user.isPrivate || false,
    hasPendingRequest: false,
    isFollowedByUser: false,
    hasActiveStory: post.user.stories?.length > 0 || false
  };

  const transformedLikes: (Like & { user: User })[] = (post.likes || []).map((like: any) => ({
    id: like.id,
    createdAt: like.createdAt,
    updatedAt: like.updatedAt,
    postId: like.postId,
    reelId: like.reelId,
    storyId: like.storyId,
    user_id: like.user_id,
    user: transformUser(like.user)
  }));

  const transformedSavedBy: (SavedPost & { user: User })[] = (post.savedBy || []).map((saved: any) => ({
    id: saved.id,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    postId: saved.postId,
    user_id: saved.user_id,
    user: transformUser(saved.user)
  }));

  const transformedTags: PostTag[] = (post.tags || []).map(transformPostTag);

  return {
    ...basePost,
    user: transformedUser,
    likes: transformedLikes,
    savedBy: transformedSavedBy,
    comments: (post.comments || []).map(transformComment),
    tags: transformedTags
  };
}

// Helper function to transform a saved post to match SavedPostWithExtras type
function transformSavedPost(savedPost: any): SavedPostWithExtras {
  const baseSavedPost: SavedPost = {
    id: savedPost.id,
    createdAt: savedPost.createdAt,
    updatedAt: savedPost.updatedAt,
    postId: savedPost.postId,
    user_id: savedPost.user_id
  };

  return {
    ...baseSavedPost,
    post: transformPost(savedPost.post),
    user: transformUser(savedPost.user)
  };
}

// Helper function to transform a story to match StoryWithExtras type
function transformStory(story: any): StoryWithExtras {
  return {
    ...story,
    user: transformUser(story.user),
    likes: story.likes?.map((like: any) => ({
      ...like,
      user: transformUser(like.user)
    })) || [],
    views: story.views?.map((view: any) => ({
      ...view,
      user: transformUser(view.user)
    })) || []
  };
}

// Helper function to transform a follower to match FollowerWithExtras type
function transformFollower(follow: any): FollowerWithExtras {
  const follower = follow.follower;
  return {
    id: follower.id,
    username: follower.username,
    name: follower.name,
    image: follower.image,
    verified: follower.verified,
    isPrivate: follower.isPrivate,
    followerId: follow.followerId,
    followingId: follow.followingId,
    status: follow.status,
    isFollowing: false,
    hasPendingRequest: false,
    uniqueId: `${follow.followerId}-${follow.followingId}`,
    follower: {
      id: follower.id,
      username: follower.username,
      name: follower.name,
      image: follower.image,
      verified: follower.verified,
      isPrivate: follower.isPrivate,
      isFollowing: false,
      hasPendingRequest: false
    }
  };
}

// Helper function to transform a following to match FollowingWithExtras type
function transformFollowing(follow: any): FollowingWithExtras {
  const following = follow.following;
  return {
    id: following.id,
    username: following.username,
    name: following.name,
    image: following.image,
    verified: following.verified,
    isPrivate: following.isPrivate,
    followerId: follow.followerId,
    followingId: follow.followingId,
    status: follow.status,
    isFollowing: false,
    hasPendingRequest: false,
    uniqueId: `${follow.followerId}-${follow.followingId}`,
    following: {
      id: following.id,
      username: following.username,
      name: following.name,
      image: following.image,
      verified: following.verified,
      isPrivate: following.isPrivate,
      isFollowing: false,
      hasPendingRequest: false
    }
  };
}

export async function fetchPosts(userId?: string) {
  try {
    const prisma = getPrisma();
    const posts = await prisma.post.findMany({
      where: {
        user_id: userId,
      },
      include: {
        user: {
          include: {
            stories: {
              select: {
                id: true,
              },
            },
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
        comments: {
          include: {
            user: true,
            likes: {
              include: {
                user: true,
              },
            },
            replies: {
              include: {
                user: true,
                likes: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        tags: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts.map((post) => transformPost({
      ...post,
      user: {
        ...post.user,
        stories: post.user.stories || [],
      },
      likes: post.likes || [],
      savedBy: post.savedBy || [],
      comments: post.comments || [],
      tags: post.tags || [],
    }));
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export async function fetchPostById(postId: string) {
  try {
    const prisma = getPrisma();
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        user: {
          include: {
            stories: {
              select: {
                id: true,
              },
            },
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
        comments: {
          include: {
            user: true,
            likes: {
              include: {
                user: true,
              },
            },
            replies: {
              include: {
                user: true,
                likes: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        tags: true,
      },
    });

    if (!post) {
      throw new Error("Post not found");
    }

    return transformPost(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    throw error;
  }
}

export async function fetchPostsByUsername(username: string, postId?: string) {
  noStore();

  try {
    const data = await getPrisma().post.findMany({
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
    const transformedData = data.map((post: PostWithExtras) => ({
      ...post,
      user: {
        ...post.user,
        hasActiveStory: post.user.stories && post.user.stories.length > 0,
        stories: undefined
      },
      comments: post.comments.map((comment: CommentWithExtras) => ({
        ...comment,
        user: {
          ...comment.user,
          hasActiveStory: comment.user.stories && comment.user.stories.length > 0,
          stories: undefined
        },
        replies: comment.replies?.map((reply: CommentWithExtras) => ({
          ...reply,
          user: {
            ...reply.user,
            hasActiveStory: reply.user.stories && reply.user.stories.length > 0,
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

export async function fetchProfile(username: string): Promise<UserWithExtras | null> {
  try {
    const prisma = getPrisma();
    const profile = await prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        posts: {
          include: {
            user: {
              include: {
                stories: {
                  select: {
                    id: true,
                  },
                },
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
            comments: {
              include: {
                user: true,
                likes: {
                  include: {
                    user: true,
                  },
                },
                replies: {
                  include: {
                    user: true,
                    likes: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
            tags: {
              include: {
                user: true,
              },
            },
          },
        },
        savedPosts: {
          include: {
            post: {
              include: {
                user: {
                  include: {
                    stories: {
                      select: {
                        id: true,
                      },
                    },
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
                comments: {
                  include: {
                    user: true,
                    likes: {
                      include: {
                        user: true,
                      },
                    },
                    replies: {
                      include: {
                        user: true,
                        likes: {
                          include: {
                            user: true,
                          },
                        },
                      },
                    },
                  },
                },
                tags: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            user: true,
          },
        },
        followers: {
          include: {
            follower: true,
          },
        },
        following: {
          include: {
            following: true,
          },
        },
        stories: {
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
        },
      },
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

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
    ]);

    const transformedProfile: UserWithExtras = {
      ...transformUser(profile),
      followersCount: followersCount.status === 'fulfilled' ? followersCount.value : 0,
      followingCount: followingCount.status === 'fulfilled' ? followingCount.value : 0,
      posts: profile.posts.map((post) => transformPost({
        ...post,
        user: {
          ...post.user,
          stories: post.user.stories || [],
        },
        likes: post.likes || [],
        savedBy: post.savedBy || [],
        comments: post.comments || [],
        tags: post.tags || [],
      })),
      savedPosts: profile.savedPosts.map((savedPost) => transformSavedPost({
        ...savedPost,
        post: {
          ...savedPost.post,
          user: {
            ...savedPost.post.user,
            stories: savedPost.post.user.stories || [],
          },
          likes: savedPost.post.likes || [],
          savedBy: savedPost.post.savedBy || [],
          comments: savedPost.post.comments || [],
          tags: savedPost.post.tags || [],
        },
      })),
      followers: profile.followers.map((follower) => transformFollower(follower)),
      following: profile.following.map((following) => transformFollowing(following)),
      stories: profile.stories.map((story) => transformStory(story)),
      isFollowing: false,
      hasPendingRequest: false,
      isFollowedByUser: false,
      followStatus: null
    };

    return transformedProfile;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
}

export async function fetchSavedPostsByUsername(username: string) {
  noStore();

  try {
    const data = await getPrisma().savedpost.findMany({
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
        user: true,
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
    const followRelationships = await getPrisma().follows.findMany({
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
    const suggestedUsers = await getPrisma().user.findMany({
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
    const notifications = await getPrisma().notification.findMany({
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

    const userExists = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      console.error("[FETCH_USER_STORIES] User not found:", userId);
      return [];
    }

    const stories = await getPrisma().story.findMany({
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
    const following = await getPrisma().follows.findMany({
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
    const stories = await getPrisma().story.findMany({
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
    const stories = await getPrisma().story.findMany({
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
    const data = await getPrisma().savedpost.findMany({
      where: {
        user_id: userId,
      },
      include: {
        post: {
          include: {
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
            user: true,
          },
        },
        user: true,
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
    const setting = await getPrisma().setting.findFirst({
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
    const posts = await getPrisma().post.findMany({
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
    const transformedPosts = posts.map((post: Post & {
      user: User & {
        stories?: { id: string }[];
      };
    }) => ({
      ...post,
      user: {
        ...post.user,
        role: post.user.role as UserRole,
        status: post.user.status as UserStatus,
        hasActiveStory: post.user.stories && post.user.stories.length > 0,
        stories: undefined // Remove stories from the response
      }
    }));

    const hasMore = posts.length === limit;

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
      getPrisma().like.findMany({
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
      getPrisma().comment.findMany({
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
      getPrisma().savedpost.findMany({
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

export async function fetchEventById(id: string) {
  noStore();

  try {
    const event = await getPrisma().event.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            image: true,
            bio: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true,
            password: true,
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
      },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Transform the event to match our interface
    const transformedEvent: EventWithUserData = {
      ...event,
      userId: event.user_id,
      prizes: event.rules ? JSON.parse(event.rules) : null,
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
