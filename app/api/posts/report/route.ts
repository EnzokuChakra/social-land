import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { postId, reason } = await request.json();

    if (!postId || !reason) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        postId,
        reason,
        userId: session.user.id,
        status: "PENDING",
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[REPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 