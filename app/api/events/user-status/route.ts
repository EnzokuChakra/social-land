import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if user is interested in the event
    const isInterested = await prisma.event.findFirst({
      where: {
        id: eventId,
        interested: {
          some: {
            id: session.user.id
          }
        }
      }
    });

    // Check if user is participating in the event
    const isParticipating = await prisma.event.findFirst({
      where: {
        id: eventId,
        participants: {
          some: {
            id: session.user.id
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      isInterested: !!isInterested,
      isParticipating: !!isParticipating
    });
  } catch (error) {
    console.error("[EVENT_USER_STATUS]", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 