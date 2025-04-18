import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role as string;
    if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reports = await prisma.report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        createdAt: true,
        postId: true,
        userId: true,
        reason: true,
        status: true,
        user: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
          },
        },
        post: {
          select: {
            id: true,
            fileUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[REPORTS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 