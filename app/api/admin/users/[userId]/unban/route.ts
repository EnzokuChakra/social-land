import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "MASTER_ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { userId } = params;

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Update user status to NORMAL
    const unbannedUser = await db.user.update({
      where: { id: userId },
      data: { status: "NORMAL" },
    });

    return NextResponse.json(unbannedUser);
  } catch (error) {
    console.error("[UNBAN_USER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 