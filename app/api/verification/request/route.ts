import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.verificationRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return new NextResponse("You already have a pending verification request", { status: 400 });
    }

    // Create new verification request
    const request = await prisma.verificationRequest.create({
      data: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("[VERIFICATION_REQUEST_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 