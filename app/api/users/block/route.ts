import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
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
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    try {
      // Check if block table exists by attempting to query it
      const blockTableExists = await db.$queryRaw`SELECT 1 FROM information_schema.tables WHERE table_name = 'block' LIMIT 1`;
      
      if (!blockTableExists) {
        return new NextResponse("Block feature is not available yet", { status: 503 });
      }

      // Check if user is already blocked
      const existingBlock = await db.block.findFirst({
        where: {
          blockerId: session.user.id,
          blockedId: userId,
        },
      });

      if (existingBlock) {
        // Unblock the user
        await db.block.delete({
          where: {
            id: existingBlock.id,
          },
        });
        return new NextResponse("User unblocked successfully", { status: 200 });
      } else {
        // Block the user
        await db.block.create({
          data: {
            blockerId: session.user.id,
            blockedId: userId,
          },
        });
        return new NextResponse("User blocked successfully", { status: 200 });
      }
    } catch (error) {
      console.error("[BLOCK_POST]", error);
      // If the error is about the block table not existing
      if (error instanceof Error && error.message.includes("block")) {
        return new NextResponse("Block feature is not available yet", { status: 503 });
      }
      return new NextResponse("Internal Error", { status: 500 });
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    try {
      // Check if block table exists by attempting to query it
      const blockTableExists = await db.$queryRaw`SELECT 1 FROM information_schema.tables WHERE table_name = 'block' LIMIT 1`;
      
      if (!blockTableExists) {
        return NextResponse.json({ isBlocked: false });
      }

      // Check if user is blocked
      const isBlocked = await db.block.findFirst({
        where: {
          blockerId: session.user.id,
          blockedId: userId,
        },
      });

      return NextResponse.json({ isBlocked: !!isBlocked });
    } catch (error) {
      console.error("[BLOCK_GET]", error);
      // If the error is about the block table not existing
      if (error instanceof Error && error.message.includes("block")) {
        return NextResponse.json({ isBlocked: false });
      }
      return new NextResponse("Internal Error", { status: 500 });
    }
  } catch (error) {
    console.error("[BLOCK_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 