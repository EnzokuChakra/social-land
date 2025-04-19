import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    console.log("[STORY_REPORT] Starting story report creation...");
    
    if (!prisma) {
      console.error("[STORY_REPORT] Prisma client not initialized");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    
    // After this point, prisma is guaranteed to be defined
    const prismaClient = prisma!;
    
    const session = await auth();
    if (!session?.user) {
      console.log("[STORY_REPORT] Unauthorized: No session or user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storyId, reason } = await request.json();
    console.log("[STORY_REPORT] Request data:", { storyId, reason });

    if (!storyId || !reason) {
      console.log("[STORY_REPORT] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (reason.length > 100) {
      console.log("[STORY_REPORT] Reason too long");
      return NextResponse.json(
        { error: "Reason must be 100 characters or less" },
        { status: 400 }
      );
    }

    // Check if story exists
    const story = await prismaClient.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      console.log("[STORY_REPORT] Story not found:", storyId);
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Check if user has already reported this story
    const existingReport = await prismaClient.storyreport.findFirst({
      where: {
        reporterId: session.user.id,
        storyId: storyId,
      },
    });

    if (existingReport) {
      console.log("[STORY_REPORT] User has already reported this story");
      return NextResponse.json(
        { error: "You have already reported this story" },
        { status: 400 }
      );
    }

    console.log("[STORY_REPORT] Creating report...");
    // Create the report
    const report = await prismaClient.storyreport.create({
      data: {
        id: crypto.randomUUID(),
        reporterId: session.user.id,
        storyId: storyId,
        reason: reason,
        status: "PENDING",
      },
    });

    console.log("[STORY_REPORT] Report created successfully:", report.id);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[STORY_REPORT_CREATE] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to create story report",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
} 