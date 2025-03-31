import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();

    if (!query) {
      return new NextResponse("Query parameter is required", { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
            },
          },
          {
            name: {
              contains: query,
            },
          },
        ],
        AND: {
          NOT: {
            id: session.user.id, // Exclude the current user
          },
          status: "NORMAL", // Only show non-banned users
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true,
      },
      take: 10, // Limit results
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[SEARCH_USERS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 