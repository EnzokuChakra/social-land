import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");

    if (!location) {
      return new NextResponse("Location is required", { status: 400 });
    }

    const skip = (page - 1) * limit;

    // Fetch posts for the given location
    const posts = await prisma.post.findMany({
      where: {
        location: location,
        OR: [
          {
            user: {
              isPrivate: false // Show posts from public accounts
            }
          },
          {
            user_id: session.user.id // Show current user's posts
          },
          {
            AND: [
              {
                user: {
                  isPrivate: true // Private accounts
                }
              },
              {
                user: {
                  followers: {
                    some: {
                      followerId: session.user.id,
                      status: "ACCEPTED"
                    }
                  }
                }
              }
            ]
          }
        ]
      },
      orderBy: {
        createdAt: "desc"
      },
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
            user_id: session.user.id
          },
          select: {
            id: true
          }
        },
        savedBy: {
          where: {
            user_id: session.user.id
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
        location: location,
        OR: [
          {
            user: {
              isPrivate: false
            }
          },
          {
            user_id: session.user.id
          },
          {
            AND: [
              {
                user: {
                  isPrivate: true
                }
              },
              {
                user: {
                  followers: {
                    some: {
                      followerId: session.user.id,
                      status: "ACCEPTED"
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    });

    return NextResponse.json({
      posts,
      hasMore: skip + limit < total,
      page,
      total
    });
  } catch (error) {
    console.error("[LOCATION_POSTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// API endpoint to get location suggestions
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the most used locations (top 5)
    const locations = await prisma.post.groupBy({
      by: ['location'],
      where: {
        location: {
          not: null
        }
      },
      _count: {
        location: true
      },
      orderBy: {
        _count: {
          location: 'desc'
        }
      },
      take: 5
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("[LOCATION_SUGGESTIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 