import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";

// Remove import from @/server
// import { emitToUser } from "@/server";

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MASTER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    if (!db) {
      return new NextResponse("Database connection error", { status: 500 });
    }

    const prisma = db as PrismaClient;

    // First, check if the request exists
    const existingRequest = await prisma.verificationrequest.findUnique({
      where: {
        id: params.requestId,
      },
    });

    if (!existingRequest) {
      return new NextResponse("Request not found", { status: 404 });
    }

    if (existingRequest.status !== "PENDING") {
      return new NextResponse("Request already processed", { status: 400 });
    }

    // Update the verification request status
    const updatedRequest = await prisma.verificationrequest.update({
      where: {
        id: params.requestId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    if (status === "APPROVED") {
      try {
        await prisma.user.update({
          where: {
            id: existingRequest.userId,
          },
          data: {
            verified: true,
          },
        });
      } catch (error) {
        console.error("Error updating user verification status:", error);
        // Don't return error here, just log it
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[VERIFICATION_REQUEST_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "MASTER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!db) {
      return new NextResponse("Database connection error", { status: 500 });
    }

    const prisma = db as PrismaClient;

    // Get the verification request to find the user
    const request = await prisma.verificationrequest.findUnique({
      where: {
        id: params.requestId,
      },
    });

    if (!request) {
      return new NextResponse("Request not found", { status: 404 });
    }

    // Delete the verification request
    await prisma.verificationrequest.delete({
      where: {
        id: params.requestId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[VERIFICATION_REQUEST_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 