import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId, reason } = await request.json();

    if (!commentId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!prisma) {
      return NextResponse.json({ error: "Database connection error" }, { status: 500 });
    }

    // Check if the comment has already been reported
    const existingReport = await prisma.commentreport.findFirst({
      where: {
        reporterId: session.user.id,
        commentId: commentId,
      },
    });

    if (existingReport) {
      return NextResponse.json({ error: "Comment already reported" }, { status: 400 });
    }

    // Create a new report
    const report = await prisma.commentreport.create({
      data: {
        id: nanoid(),
        reporterId: session.user.id,
        commentId,
        reason,
        status: "PENDING",
        createdAt: new Date(),
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[COMMENT_REPORT_CREATE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 