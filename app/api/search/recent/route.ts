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
      include: {
        searchedUser: {
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

    console.log("[RECENT_SEARCHES] Found searches:", recentSearches.length);
    return NextResponse.json(recentSearches.map(search => ({
      ...search,
      searchedUser: search.searchedUser || {
        id: search.searchedId,
        username: "Unknown User",
        name: null,
        image: null,
        verified: false
      }
    })));
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

    // Check if this search already exists
    const existingSearch = await prisma.recentsearch.findFirst({
      where: {
        userId: session.user.id,
        searchedId: searchedId,
      },
    });

    if (existingSearch) {
      // Update the timestamp to move it to the top
      const updatedSearch = await prisma.recentsearch.update({
        where: {
          id: existingSearch.id,
        },
        data: {
          createdAt: new Date(),
        },
        include: {
          searchedUser: {
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
      return NextResponse.json(updatedSearch);
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
      },
      include: {
        searchedUser: {
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

    return NextResponse.json(recentSearch);
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