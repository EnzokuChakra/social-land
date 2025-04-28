import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { io } from "@/socket.server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prisma) {
      return new NextResponse("Database connection error", { status: 500 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.verificationrequest.findFirst({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return new NextResponse("You already have a pending verification request", { status: 400 });
    }

    // Create new verification request
    const request = await prisma.verificationrequest.create({
      data: {
        id: nanoid(),
        userId: session.user.id,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });

    // Emit socket event for real-time update with complete data object
    if (io) {
      // Emit to all channels/sockets that might need to update
      io.emit(`user:${session.user.id}`, {
        type: "VERIFICATION_REQUESTED",
        data: {
          hasRequest: true,
          status: "PENDING",
          isVerified: false,
          message: "Verification request submitted successfully"
        }
      });
    }

    // Return the request with a success message
    return NextResponse.json({
      request,
      message: "Verification request submitted successfully"
    });
  } catch (error) {
    console.error("[VERIFICATION_REQUEST_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 