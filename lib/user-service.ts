import { prisma } from "@/lib/prisma";

export async function getUserProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          comments: {
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
          savedBy: true,
        },
      },
      reels: {
        orderBy: { createdAt: 'desc' },
        include: {
          comments: {
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
      },
      savedPosts: {
        include: {
          post: {
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
      },
      followers: {
        where: {
          status: "ACCEPTED",
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              image: true,
            },
          },
        },
      },
      following: {
        where: {
          status: "ACCEPTED",
        },
        include: {
          following: {
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

  return user;
} 