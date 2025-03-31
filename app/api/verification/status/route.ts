import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

// Cache for verification status
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const now = Date.now();
    const cached = cache.get(userId);

    // Return cached data if it's still valid
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    const request = await prisma.verificationRequest.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = {
      hasRequest: !!request,
      status: request?.status || null,
    };

    // Cache the result
    cache.set(userId, { data, timestamp: now });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[VERIFICATION_STATUS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 