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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role as string;
    if (!["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { status } = await request.json();

    if (!status || !["REVIEWED", "DISMISSED"].includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    const report = await prisma.report.update({
      where: {
        id: params.reportId,
      },
      data: {
        status,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[REPORT_STATUS_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 