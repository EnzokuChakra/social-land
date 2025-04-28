import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !["ADMIN", "MASTER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: "Database connection error" }, { status: 500 });
    }

    const reports = await prisma.commentreport.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
        comment: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true,
              }
            }
          }
        }
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[ADMIN_GET_COMMENT_REPORTS] Error fetching comment reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 