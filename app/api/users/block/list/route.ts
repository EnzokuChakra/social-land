import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all users that the current user has blocked
    const blockedUsers = await db.block.findMany({
      where: {
        blockerId: session.user.id,
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verified: true,
            isPrivate: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Transform the response to only include the blocked user data
    const users = blockedUsers.map(block => block.blocked);

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[BLOCK_LIST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 