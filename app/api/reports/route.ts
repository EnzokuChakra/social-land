import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    console.log("[USER_REPORT] Starting user report creation...");
    
    if (!prisma) {
      console.error("[USER_REPORT] Prisma client not initialized");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("[USER_REPORT] Unauthorized: No session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, reason } = body;
    console.log("[USER_REPORT] Request data:", { userId, reason });

    if (!userId || !reason) {
      console.log("[USER_REPORT] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (reason.length > 100) {
      console.log("[USER_REPORT] Reason too long");
      return NextResponse.json(
        { error: "Reason must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log("[USER_REPORT] User not found:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has already reported this user
    const existingReport = await prisma.userreport.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId: userId,
      },
    });

    if (existingReport) {
      console.log("[USER_REPORT] User has already reported this user");
      return NextResponse.json(
        { error: "You have already reported this user" },
        { status: 400 }
      );
    }

    console.log("[USER_REPORT] Creating report...");
    // Create new report
    const report = await prisma.userreport.create({
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

    console.log("[USER_REPORT] Report created successfully:", report.id);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[USER_REPORT_CREATE] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to create user report",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
} 