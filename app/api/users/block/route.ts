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
      const existingBlock = await db.$queryRaw`
        SELECT * FROM block 
        WHERE blockerId = ${session.user.id} 
        AND blockedId = ${userId}
        LIMIT 1
      `;

      if (existingBlock && existingBlock.length > 0) {
        // Unblock the user
        await db.$queryRaw`
          DELETE FROM block 
          WHERE blockerId = ${session.user.id} 
          AND blockedId = ${userId}
        `;
        return new NextResponse("User unblocked successfully", { status: 200 });
      } else {
        // Block the user
        await db.$queryRaw`
          INSERT INTO block (id, blockerId, blockedId, createdAt, updatedAt)
          VALUES (UUID(), ${session.user.id}, ${userId}, NOW(), NOW())
        `;
        
        // Delete follow relationships in both directions
        // 1. Where current user is following the blocked user
        await db.follows.deleteMany({
          where: {
            followerId: session.user.id,
            followingId: userId
          }
        });
        
        // 2. Where blocked user is following the current user
        await db.follows.deleteMany({
          where: {
            followerId: userId,
            followingId: session.user.id
          }
        });

        // Delete follow requests in both directions
        await db.follows.deleteMany({
          where: {
            OR: [
              {
                followerId: session.user.id,
                followingId: userId,
                status: "PENDING"
              },
              {
                followerId: userId,
                followingId: session.user.id,
                status: "PENDING"
              }
            ]
          }
        });

        // Delete notifications between the users
        await db.notification.deleteMany({
          where: {
            OR: [
              {
                userId: session.user.id,
                sender_id: userId
              },
              {
                userId: userId,
                sender_id: session.user.id
              }
            ]
          }
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
      const isBlocked = await db.$queryRaw`
        SELECT 1 FROM block 
        WHERE blockerId = ${session.user.id} 
        AND blockedId = ${userId}
        LIMIT 1
      `;

      return NextResponse.json({ isBlocked: isBlocked && isBlocked.length > 0 });
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