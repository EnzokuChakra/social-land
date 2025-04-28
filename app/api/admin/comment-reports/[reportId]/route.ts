import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    console.log("[ADMIN_PATCH_COMMENT_REPORT] Starting report update...");
    
    if (!prisma) {
      console.error("[ADMIN_PATCH_COMMENT_REPORT] Prisma client not initialized");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const session = await auth();

    if (!session?.user || !["ADMIN", "MASTER_ADMIN"].includes(session.user.role as string)) {
      console.log("[ADMIN_PATCH_COMMENT_REPORT] Unauthorized: Invalid role");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = params;
    const { status } = await request.json();
    console.log("[ADMIN_PATCH_COMMENT_REPORT] Request data:", { reportId, status });

    if (!reportId || !status || !["REVIEWED", "DISMISSED"].includes(status)) {
      console.log("[ADMIN_PATCH_COMMENT_REPORT] Invalid request data");
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Fetch the original report to preserve the original reason
    const originalReport = await prisma.commentreport.findUnique({
      where: { id: reportId },
      select: { reason: true }
    });

    if (!originalReport) {
      console.log("[ADMIN_PATCH_COMMENT_REPORT] Report not found:", reportId);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Prevent updating if already has review info (to avoid multiple review lines)
    if (originalReport.reason?.includes('\n\nReviewed by')) {
      console.log("[ADMIN_PATCH_COMMENT_REPORT] Report already reviewed, updating status only");
      const updatedReport = await prisma.commentreport.update({
        where: { id: reportId },
        data: { status },
      });
      return NextResponse.json(updatedReport);
    }

    // Append review information
    const reviewerUsername = session.user.username || "UnknownAdmin";
    const reviewTimestamp = new Date().toISOString();
    const updatedReason = `${originalReport.reason || 'No reason provided'}\n\nReviewed by @${reviewerUsername} at ${reviewTimestamp}`;

    console.log("[ADMIN_PATCH_COMMENT_REPORT] Updating report with review info...");
    const updatedReport = await prisma.commentreport.update({
      where: { id: reportId },
      data: {
        status,
        reason: updatedReason,
      },
    });

    console.log("[ADMIN_PATCH_COMMENT_REPORT] Report updated successfully:", reportId);
    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("[ADMIN_PATCH_COMMENT_REPORT] Error updating report:", error);
    return NextResponse.json(
      { 
        error: "Failed to update report status",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
} 