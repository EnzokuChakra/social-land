import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const count = await prisma.follows.count({
      where: {
        followingId: session.user.id,
        status: "PENDING"
      }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[FOLLOW_REQUESTS_COUNT] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 