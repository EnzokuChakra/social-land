import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const request = await prisma.verificationRequest.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = {
      hasRequest: !!request,
      status: request?.status || null,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("[VERIFICATION_STATUS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 