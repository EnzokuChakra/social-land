import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface User {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  verified: boolean;
  isPrivate: boolean;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error("[FOLLOWERS_SEARCH_API] Unauthorized request - no session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    console.log("[FOLLOWERS_SEARCH_API] Searching for:", query);

    // Use raw SQL for case-insensitive search that works in both PostgreSQL and SQLite
    const users = await prisma.$queryRaw<User[]>`
      SELECT u.id, u.username, u.name, u.image, u.verified, u."isPrivate"
      FROM "User" u
      INNER JOIN "Follow" f ON f."followerId" = u.id
      WHERE f."followingId" = ${session.user.id}
      AND f.status = 'ACCEPTED'
      AND (
        LOWER(u.username) LIKE LOWER(${`%${query}%`}) OR
        LOWER(u.name) LIKE LOWER(${`%${query}%`})
      )
      AND u.id != ${session.user.id}
      AND u.status = 'NORMAL'
      ORDER BY 
        CASE 
          WHEN LOWER(u.username) = LOWER(${query}) THEN 1
          WHEN LOWER(u.username) LIKE LOWER(${`${query}%`}) THEN 2
          ELSE 3
        END,
        u.username
      LIMIT 20
    `;

    console.log("[FOLLOWERS_SEARCH_API] Found users:", users.length);

    return NextResponse.json(users);
  } catch (error) {
    console.error("[FOLLOWERS_SEARCH_API] Error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Error", { status: 500 });
  }
} 