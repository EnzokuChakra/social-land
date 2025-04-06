import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new NextResponse(
        JSON.stringify({ error: "Missing required fields" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    });

    if (!user?.password) {
      return new NextResponse(
        JSON.stringify({ error: "User not found or no password set" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return new NextResponse(
        JSON.stringify({ error: "Current password is incorrect" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    });

    return new NextResponse(
      JSON.stringify({ message: "Password updated successfully" }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[PASSWORD_CHANGE]", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Error" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 