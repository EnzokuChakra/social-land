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
import { db } from "@/lib/db";

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

type UserWithFollowStatus = User & {
  isFollowing?: boolean;
  hasPendingRequest?: boolean;
  isPrivate?: boolean;
};

export async function fetchPosts(userId?: string) {
  noStore();
  try {
    const posts = await prisma.post.findMany({
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
      take: 20
    });

    // If userId is provided, get follow status for each user in likes array
    if (userId) {
      const postsWithFollowStatus = await Promise.all(
        posts.map(async (post: PostWithExtras) => {
          const likesWithFollowStatus = await Promise.all(
            post.likes.map(async (like: Like & { user: UserWithFollowStatus }) => {
              if (!like.user) return like;

              // Get follow relationship
              const follow = await prisma.follows.findFirst({
                where: {
                  followerId: userId,
                  followingId: like.user.id,
                  status: {
                    in: ["ACCEPTED", "PENDING"]
                  }
                }
              });

              return {
                ...like,
                user: {
                  ...like.user,
                  isFollowing: follow?.status === "ACCEPTED" || false,
                  hasPendingRequest: follow?.status === "PENDING" || false
                }
              };
            })
          );

          return {
            ...post,
            likes: likesWithFollowStatus
          };
        })
      );

      return postsWithFollowStatus;
    }

    return posts;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function fetchPostById(postId: string) {
  noStore();

  try {
    const post = await prisma.post.findUnique({
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

    if (!post) return null;

    // Get total comment count
    const totalComments = await prisma.comment.count({
      where: {
        postId: postId,
        parentId: null // Only count top-level comments
      }
    });

    // Get follow status for each user in likes array
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }

    const likesWithFollowStatus = await Promise.all(
      post.likes.map(async (like: Like & { user: UserWithFollowStatus | null }) => {
        if (!like.user) {
          return like;
        }
        
        const follow = await prisma.follows.findUnique({
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
        hasActiveStory: post.user.stories && post.user.stories.length > 0
      },
      hasMore: totalComments > post.comments.length,
      totalComments
    };

    return transformedPost;
  } catch (error) {
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
  noStore();

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!username) {
      return null;
    }

    // First get the user's ID
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (!user) {
      return null;
    }

    // Then get the full profile with followers/following
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        // Get user's own posts
        posts: {
          orderBy: {
            createdAt: "desc",
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
                    name: true,
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
                        name: true,
                        image: true,
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
                        name: true,
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
                            name: true,
                            image: true,
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
                    name: true,
                    image: true,
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
                    name: true,
                    image: true,
                    verified: true
                  }
                }
              }
            },
            user: {
              select: {
                id: true,
                username: true,
                name: true,
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
        savedPosts: {
          include: {
            post: {
              include: {
                likes: {
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
                        name: true,
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
                            name: true,
                            image: true,
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
                            name: true,
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
                                name: true,
                                image: true,
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
                savedBy: {
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
                },
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
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
            }
          }
        },
        stories: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          },
          include: {
            likes: {
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
            },
            views: {
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
        }
      }
    });

    if (!profile) {
      return null;
    }

    // Fetch tagged posts separately
    const taggedPosts = await prisma.post.findMany({
      where: {
        tags: {
          some: {
            userId: profile.id
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        comments: {
          where: {
            parentId: null
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
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
                    name: true,
                    image: true,
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
                    name: true,
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
                        name: true,
                        image: true,
                        verified: true
                      }
                    }
                  }
                }
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
                name: true,
                image: true,
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
                name: true,
                image: true,
                verified: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true,
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

    // Get followers and following counts with error handling
    const [followersCount, followingCount] = await Promise.allSettled([
      prisma.follows.count({
        where: {
          followingId: user.id,
          status: "ACCEPTED",
        },
      }),
      prisma.follows.count({
        where: {
          followerId: user.id,
          status: "ACCEPTED",
        },
      }),
    ]).then(results => results.map(result => 
      result.status === 'fulfilled' ? result.value : 0
    ));

    // Get followers and following
    const [followers, following] = await Promise.allSettled([
      prisma.follows.findMany({
        where: {
          followingId: user.id,
          status: "ACCEPTED"
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
              role: true,
              status: true
            }
          }
        }
      }),
      prisma.follows.findMany({
        where: {
          followerId: user.id,
          status: "ACCEPTED"
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
              role: true,
              status: true
            }
          }
        }
      })
    ]);

    // Handle potential failures in parallel queries
    const followersResult = followers.status === 'fulfilled' ? followers.value : [];
    const followingResult = following.status === 'fulfilled' ? following.value : [];

    // Transform followers and following data with proper types
    const transformedFollowers = followersResult.map((f: FollowerData) => ({
      ...f.follower,
      followerId: f.followerId,
      followingId: f.followingId,
      status: f.status
    }));

    const transformedFollowing = followingResult.map((f: FollowingData) => ({
      ...f.following,
      followerId: f.followerId,
      followingId: f.followingId,
      status: f.status
    }));

    // Get follow status if logged in user is viewing another profile
    let followStatus = null;
    if (userId && userId !== user.id) {
      const follow = await prisma.follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: user.id,
          },
        },
        select: {
          status: true,
        },
      });
      followStatus = follow?.status || null;
    }

    const result = {
      ...profile,
      posts: profile.posts.map((post: PostWithExtras) => ({
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
      })),
      taggedPosts: taggedPosts.map((post: PostWithExtras) => ({
        id: post.id,
        fileUrl: post.fileUrl,
        caption: post.caption,
        aspectRatio: post.aspectRatio,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        user: {
          ...post.user,
          hasActiveStory: post.user.stories && post.user.stories.length > 0,
          stories: undefined
        },
        likes: post.likes || [],
        comments: (post.comments || []).map((comment: CommentWithExtras) => ({
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
        })),
        savedBy: post.savedBy || [],
        tags: post.tags || []
      })),
      savedPosts: profile.savedPosts.map((savedPost: SavedPostWithExtras) => ({
        ...savedPost,
        post: {
          ...(savedPost.post as PostWithExtras),
          user: {
            ...(savedPost.post as PostWithExtras).user,
            hasActiveStory: !!(savedPost.post as PostWithExtras).user?.stories?.length,
            stories: undefined
          }
        }
      })),
      followers: transformedFollowers,
      following: transformedFollowing,
      followersCount,
      followingCount,
      ...(userId && userId !== user.id ? {
        isFollowing: followStatus === "ACCEPTED",
        hasPendingRequest: followStatus === "PENDING",
        followStatus
      } : {})
    };

    return result;
  } catch (error) {
    throw new Error("Failed to fetch profile");
  }
}

export async function fetchSavedPostsByUsername(username: string) {
  noStore();

  try {
    const data = await prisma.savedpost.findMany({
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
          where: {
            user_id: userId
          },
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
    const data = await prisma.savedpost.findMany({
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
      prisma.savedpost.findMany({
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

export async function isUserBlocked(blockerId: string, blockedId: string) {
  try {
    const blockedUser = await db.BlockedUser.findFirst({
      where: {
        blockerId,
        blockedId,
      },
    });
    return !!blockedUser;
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return false;
  }
}
