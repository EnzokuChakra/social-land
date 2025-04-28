import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSocket } from "@/lib/socket";

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

    if (!db) {
      return new NextResponse("Database connection error", { status: 500 });
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

    // Update user status to BANNED
    const bannedUser = await db.user.update({
      where: { id: userId },
      data: { status: "BANNED" },
    });

    // Create a response with the banned user data
    const response = NextResponse.json(bannedUser);
    
    // Add a custom header to indicate the user was banned
    response.headers.set('X-User-Banned', 'true');
    
    // Force token refresh by setting a cookie
    response.cookies.set('force-token-refresh', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 // 1 minute
    });

    // Emit socket event to notify the banned user
    const socket = getServerSocket();
    if (socket) {
      socket.emit('userBanned', { userId });
    }
    
    return response;
  } catch (error) {
    console.error("[BAN_USER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 