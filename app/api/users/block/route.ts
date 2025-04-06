import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const BlockUserSchema = z.object({
  blockedId: z.string(),
  action: z.enum(["block", "unblock"])
});

export async function POST(req: Request) {
  try {
    if (!prisma) {
      console.error("[BLOCK_API] Prisma client not initialized");
      return new NextResponse(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error("[BLOCK_API] Unauthorized request - no session");
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = BlockUserSchema.parse(body);
    const { blockedId, action } = validatedData;

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: blockedId }
    });

    if (!userExists) {
      return new NextResponse(
        JSON.stringify({ error: "User not found" }),
        { status: 404 }
      );
    }

    if (action === "block") {
      // Check if already blocked
      const existingBlock = await prisma.blockedUser.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: session.user.id,
            blockedId
          }
        }
      });

      if (existingBlock) {
        return new NextResponse(
          JSON.stringify({ error: "User is already blocked" }),
          { status: 400 }
        );
      }

      // Create block relationship
      await prisma.blockedUser.create({
        data: {
          blockerId: session.user.id,
          blockedId
        }
      });

      // Delete any existing follow relationships
      await prisma.follows.deleteMany({
        where: {
          OR: [
            {
              followerId: session.user.id,
              followingId: blockedId
            },
            {
              followerId: blockedId,
              followingId: session.user.id
            }
          ]
        }
      });

      return new NextResponse(
        JSON.stringify({ message: "User blocked successfully" }),
        { status: 200 }
      );
    } else {
      // Unblock user
      const existingBlock = await prisma.blockedUser.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: session.user.id,
            blockedId
          }
        }
      });

      if (!existingBlock) {
        return new NextResponse(
          JSON.stringify({ error: "User is not blocked" }),
          { status: 400 }
        );
      }

      await prisma.blockedUser.delete({
        where: {
          blockerId_blockedId: {
            blockerId: session.user.id,
            blockedId
          }
        }
      });

      return new NextResponse(
        JSON.stringify({ message: "User unblocked successfully" }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("[BLOCK_API] Error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to process block request"
      }), 
      { status: 500 }
    );
  }
} 