import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get users that the current user is following
    const following = await prisma.follows.findMany({
      where: {
        followerId: session.user.id,
        status: "ACCEPTED"
      },
      include: {
        following: true
      }
    });

    // Extract just the user objects from the following relationships
    const users = following.map(f => f.following);

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching following:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 