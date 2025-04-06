import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const blockedUsers = await prisma.block.findMany({
      where: {
        blockerId: session.user.id
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            verified: true
          }
        }
      }
    });

    return new NextResponse(
      JSON.stringify(blockedUsers), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[BLOCKED_USERS_LIST]", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Error" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 