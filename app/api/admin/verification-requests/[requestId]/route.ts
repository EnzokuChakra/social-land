import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { io } from "@/lib/socket.server";

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "MASTER_ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status } = await req.json();

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    // Update the verification request status
    const updatedRequest = await db.verificationRequest.update({
      where: {
        id: params.requestId,
      },
      data: {
        status,
      },
      include: {
        user: true,
      },
    });

    // If approved, update the user's verified status
    if (status === "APPROVED") {
      await db.user.update({
        where: {
          id: updatedRequest.user.id,
        },
        data: {
          verified: true,
        },
      });

      // Emit socket event to notify the user if io is available
      if (io) {
        io.emit(`user:${updatedRequest.user.id}`, {
          type: "VERIFICATION_APPROVED",
          data: {
            verified: true,
            message: "Your account has been verified!"
          }
        });
      }
    }

    return NextResponse.json({ request: updatedRequest });
  } catch (error) {
    console.error("[VERIFICATION_REQUEST_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 