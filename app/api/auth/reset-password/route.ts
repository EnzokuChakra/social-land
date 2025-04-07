import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transporter, emailTemplates } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "If an account exists, we've sent a password reset link" },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;

    // Send email
    const emailTemplate = emailTemplates.resetPassword(resetLink);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to: user.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return NextResponse.json(
      { message: "If an account exists, we've sent a password reset link" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 