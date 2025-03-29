import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Get recent searches
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("[RECENT_SEARCHES] Fetching searches for user:", session.user.id);

    const recentSearches = await prisma.recentsearch.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      distinct: ['searchedId'],
      take: 10,
    });

    // Get all unique searched IDs
    const searchedIds = [...new Set(recentSearches.map(search => search.searchedId))];

    // Fetch all users in a single query
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: searchedIds
        }
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true,
      }
    });

    // Create a map of users for quick lookup
    const userMap = new Map(users.map(user => [user.id, user]));

    // Map the searches with user data
    const validSearches = recentSearches
      .map(search => {
        const user = userMap.get(search.searchedId);
        if (!user) return null;

        return {
          id: search.id,
          userId: search.userId,
          searchedId: search.searchedId,
          createdAt: search.createdAt,
          searchedUser: {
            id: user.id,
            username: user.username || "Unknown User",
            name: user.name,
            image: user.image,
            verified: user.verified
          }
        };
      })
      .filter((search): search is NonNullable<typeof search> => search !== null);

    console.log("[RECENT_SEARCHES] Found searches:", validSearches.length);
    return NextResponse.json(validSearches);
  } catch (error: any) {
    console.error("[RECENT_SEARCHES] Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name
    });
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal Error",
        details: error.message 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Add a recent search
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { userId: searchedId } = body;

    if (!searchedId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if the searched user exists
    const searchedUser = await prisma.user.findUnique({
      where: {
        id: searchedId
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true,
      }
    });

    if (!searchedUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Check if this search already exists
    const existingSearch = await prisma.recentsearch.findFirst({
      where: {
        userId: session.user.id,
        searchedId: searchedId,
      }
    });

    if (existingSearch) {
      // Update the timestamp to move it to the top
      const updatedSearch = await prisma.recentsearch.update({
        where: {
          id: existingSearch.id,
        },
        data: {
          createdAt: new Date(),
        }
      });

      return NextResponse.json({
        id: updatedSearch.id,
        userId: updatedSearch.userId,
        searchedId: updatedSearch.searchedId,
        createdAt: updatedSearch.createdAt,
        searchedUser: {
          id: searchedUser.id,
          username: searchedUser.username || "Unknown User",
          name: searchedUser.name,
          image: searchedUser.image,
          verified: searchedUser.verified
        }
      });
    }

    // If no existing search, check if we need to remove the oldest one
    const searchCount = await prisma.recentsearch.count({
      where: {
        userId: session.user.id,
      },
    });

    if (searchCount >= 10) {
      const oldestSearch = await prisma.recentsearch.findFirst({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (oldestSearch) {
        await prisma.recentsearch.delete({
          where: {
            id: oldestSearch.id,
          },
        });
      }
    }

    // Create new recent search
    const recentSearch = await prisma.recentsearch.create({
      data: {
        id: `${session.user.id}-${searchedId}-${Date.now()}`,
        userId: session.user.id,
        searchedId,
      }
    });

    return NextResponse.json({
      id: recentSearch.id,
      userId: recentSearch.userId,
      searchedId: recentSearch.searchedId,
      createdAt: recentSearch.createdAt,
      searchedUser: {
        id: searchedUser.id,
        username: searchedUser.username || "Unknown User",
        name: searchedUser.name,
        image: searchedUser.image,
        verified: searchedUser.verified
      }
    });
  } catch (error) {
    console.error("[RECENT_SEARCH_CREATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Clear all recent searches
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.recentsearch.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[RECENT_SEARCHES_CLEAR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 