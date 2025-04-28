import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

// Ensure prisma is initialized
const db = prisma || new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;

    // Delete the recent search
    await db.recentsearch.delete({
      where: {
        id,
        userId: session.user.id, // Ensure the user can only delete their own searches
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[RECENT_SEARCH_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 