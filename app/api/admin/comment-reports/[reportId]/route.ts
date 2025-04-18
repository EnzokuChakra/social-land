import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || !["ADMIN", "MASTER_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = params;
    const { status } = await request.json();

    if (!reportId || !status || !["REVIEWED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Fetch the original report to preserve the original reason
    const originalReport = await db.commentReport.findUnique({
      where: { id: reportId },
      select: { reason: true }
    });

    if (!originalReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Prevent updating if already has review info (to avoid multiple review lines)
    if (originalReport.reason?.includes('\n\nReviewed by')) {
       const updatedReport = await db.commentReport.update({
         where: { id: reportId },
         data: { status },
       });
       return NextResponse.json(updatedReport);
    }

    // Append review information
    const reviewerUsername = session.user.username || "UnknownAdmin";
    const reviewTimestamp = new Date().toISOString();
    const updatedReason = `${originalReport.reason || 'No reason provided'}\n\nReviewed by @${reviewerUsername} at ${reviewTimestamp}`;

    const updatedReport = await db.commentReport.update({
      where: { id: reportId },
      data: {
        status,
        reason: updatedReason,
      },
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("[ADMIN_PATCH_COMMENT_REPORT] Error updating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 