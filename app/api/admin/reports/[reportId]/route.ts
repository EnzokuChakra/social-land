import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role as string;
    if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status } = await request.json();

    if (!status || !["REVIEWED", "DISMISSED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the current report to preserve the original reason
    const currentReport = await prisma.report.findUnique({
      where: { id: params.reportId },
    });

    if (!currentReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Create a new reason that includes the reviewer info
    const newReason = status === "REVIEWED" 
      ? `${currentReport.reason || ""}\n\nReviewed by @${session.user.username} at ${new Date().toISOString()}`
      : currentReport.reason;

    const report = await prisma.report.update({
      where: {
        id: params.reportId,
      },
      data: {
        status,
        reason: newReason,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[REPORT_STATUS_UPDATE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 