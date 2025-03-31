import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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
      return NextResponse.json({ users: [] });
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
            id: session.user.id,
          },
          status: "NORMAL",
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        verified: true,
      },
      take: 10,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[SEARCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 