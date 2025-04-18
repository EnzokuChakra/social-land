import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if user is already participating
    const existingParticipation = await prisma.event.findFirst({
      where: {
        id: eventId,
        participants: {
          some: {
            id: session.user.id
          }
        }
      }
    });

    if (existingParticipation) {
      // Remove participation
      await prisma.event.update({
        where: { id: eventId },
        data: {
          participants: {
            disconnect: {
              id: session.user.id
            }
          }
        }
      });
    } else {
      // Add participation
      await prisma.event.update({
        where: { id: eventId },
        data: {
          participants: {
            connect: {
              id: session.user.id
            }
          }
        }
      });
    }

    // Get updated counts
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            interested: true,
            participants: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      isParticipating: !existingParticipation,
      counts: updatedEvent?._count
    });
  } catch (error) {
    console.error("[EVENT_PARTICIPATE]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 