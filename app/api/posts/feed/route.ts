export async function GET(req: Request) {
  try {
    if (!prisma) {
      console.error("[FEED_API] Prisma client not initialized");
      return new NextResponse(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error("[FEED_API] Unauthorized request - no session");
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    // Get the list of users that the current user has blocked
    const blockedUsers = await prisma.blockedUser.findMany({
      where: {
        blockerId: session.user.id
      },
      select: {
        blockedId: true
      }
    });

    const blockedUserIds = blockedUsers.map(block => block.blockedId);

    // Get posts from users that the current user follows and hasn't blocked
    const posts = await prisma.post.findMany({
      where: {
        userId: {
          notIn: blockedUserIds
        },
        OR: [
          {
            user: {
              followers: {
                some: {
                  followerId: session.user.id,
                  status: "ACCEPTED"
                }
              }
            }
          },
          {
            userId: session.user.id
          }
        ]
      },
      include: {
        user: true,
        likes: true,
        comments: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return new NextResponse(JSON.stringify(posts), { status: 200 });
  } catch (error) {
    console.error("[FEED_API] Error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to fetch feed"
      }), 
      { status: 500 }
    );
  }
} 