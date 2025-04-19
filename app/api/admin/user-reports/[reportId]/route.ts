import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    console.log("[ADMIN_PATCH_USER_REPORT] Starting report update...");
    
    if (!prisma) {
      console.error("[ADMIN_PATCH_USER_REPORT] Prisma client not initialized");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user) {
      console.log("[ADMIN_PATCH_USER_REPORT] Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role as string;
    if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      console.log("[ADMIN_PATCH_USER_REPORT] Forbidden: Invalid role", userRole);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();
    console.log("[ADMIN_PATCH_USER_REPORT] Request data:", { reportId: params.reportId, status });

    if (!status || !["REVIEWED", "DISMISSED"].includes(status)) {
      console.log("[ADMIN_PATCH_USER_REPORT] Invalid status:", status);
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the current report to preserve the original reason
    const currentReport = await prisma.userreport.findUnique({
      where: { id: params.reportId },
    });

    if (!currentReport) {
      console.log("[ADMIN_PATCH_USER_REPORT] Report not found:", params.reportId);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Create a new reason that includes the reviewer info
    const newReason = status === "REVIEWED" 
      ? `${currentReport.reason || ""}\n\nReviewed by @${session.user.username} at ${new Date().toISOString()}`
      : currentReport.reason;

    console.log("[ADMIN_PATCH_USER_REPORT] Updating report with new status...");
    const report = await prisma.userreport.update({
      where: {
        id: params.reportId,
      },
      data: {
        status,
        reason: newReason,
      },
    });

    console.log("[ADMIN_PATCH_USER_REPORT] Report updated successfully:", params.reportId);
    return NextResponse.json(report);
  } catch (error) {
    console.error("[ADMIN_PATCH_USER_REPORT] Error updating report:", error);
    return NextResponse.json(
      { 
        error: "Failed to update report status",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
} 