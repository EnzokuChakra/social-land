import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { userId, reason } = body;

    if (!userId || !reason) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if user has already reported this user
    const existingReport = await db.userReport.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId: userId,
      },
    });

    if (existingReport) {
      return new NextResponse("You have already reported this user", { status: 400 });
    }

    // Create new report
    const report = await db.userReport.create({
      data: {
        id: crypto.randomUUID(),
        reporterId: session.user.id,
        reportedId: userId,
        reason: reason,
        status: "PENDING",
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
          },
        },
        reported: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[REPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 