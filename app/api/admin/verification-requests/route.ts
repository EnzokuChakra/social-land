import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "MASTER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const requests = await prisma.verificationrequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        userId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Fetch user details separately
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: requests.map(r => r.userId)
        }
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
      },
    });

    // Combine the data
    const requestsWithUsers = requests.map(request => ({
      ...request,
      user: users.find(user => user.id === request.userId)
    }));

    return NextResponse.json({ requests: requestsWithUsers });
  } catch (error) {
    console.error("[VERIFICATION_REQUESTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 