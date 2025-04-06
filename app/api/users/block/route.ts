import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prisma) {
      return new NextResponse("Database connection not available", { status: 503 });
    }

    let userId: string;
    const contentType = req.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      const body = await req.json();
      userId = body.userId;
    } else {
      const formData = await req.formData();
      userId = formData.get("userId") as string;
    }

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    try {
      // Check if user is already blocked
      const existingBlock = await prisma.block.findFirst({
        where: {
          blockerId: session.user.id,
          blockedId: userId,
        },
      });

      if (existingBlock) {
        // Unblock the user
        await prisma.block.delete({
          where: {
            id: existingBlock.id,
          },
        });
        return new NextResponse("User unblocked successfully", { status: 200 });
      } else {
        // Block the user
        await prisma.block.create({
          data: {
            blockerId: session.user.id,
            blockedId: userId,
          },
        });
        return new NextResponse("User blocked successfully", { status: 200 });
      }
    } catch (error) {
      // If the error is about the block table not existing
      if (error instanceof Error && error.message.includes("block")) {
        return new NextResponse("Block feature is not available yet", { status: 503 });
      }
      throw error; // Re-throw other errors
    }
  } catch (error) {
    console.error("[BLOCK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ isBlocked: false });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    try {
      // Check if user is blocked
      const isBlocked = await prisma.block.findFirst({
        where: {
          blockerId: session.user.id,
          blockedId: userId,
        },
      });

      return NextResponse.json({ isBlocked: !!isBlocked });
    } catch (error) {
      // If the error is about the block table not existing
      if (error instanceof Error && error.message.includes("block")) {
        return NextResponse.json({ isBlocked: false });
      }
      throw error; // Re-throw other errors
    }
  } catch (error) {
    console.error("[BLOCK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 