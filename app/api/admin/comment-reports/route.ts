import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || !["ADMIN", "MASTER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await db.commentReport.findMany({
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
            user: { // Include the user who wrote the comment
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