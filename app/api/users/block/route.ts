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

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if user is already blocked
    const existingBlock = await db.block.findFirst({
      where: {
        blockerId: session.user.id,
        blockedId: userId,
      },
    });

    if (existingBlock) {
      return new NextResponse("User is already blocked", { status: 400 });
    }

    // Create new block
    const block = await db.block.create({
      data: {
        id: crypto.randomUUID(),
        blockerId: session.user.id,
        blockedId: userId,
      },
    });

    return NextResponse.json(block);
  } catch (error) {
    console.error("[BLOCK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 