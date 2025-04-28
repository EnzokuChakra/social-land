import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, reason } = await request.json();

    if (!userId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (reason.length > 100) {
      return NextResponse.json(
        { error: "Reason must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Check if user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!reportedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-reporting
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot report yourself" },
        { status: 400 }
      );
    }

    // Create the report
    const report = await prisma.userReport.create({
      data: {
        reporterId: session.user.id,
        reportedId: userId,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[USER_REPORT_CREATE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 