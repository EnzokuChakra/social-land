import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/server-utils";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, username, bio, image } = data;

    // Get current user data to check for existing image
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { image: true }
    });

    // If user has an existing image and either no new image is provided or it's different
    if (currentUser?.image) {
      try {
        console.log("[PROFILE_UPDATE] Attempting to delete old image:", currentUser.image);
        // Remove timestamp from URL if present
        const cleanImageUrl = currentUser.image.split('?')[0];
        await deleteUploadedFile(cleanImageUrl);
        console.log("[PROFILE_UPDATE] Successfully deleted old image");
      } catch (error) {
        console.error("[PROFILE_UPDATE] Error deleting old image:", error);
        // Continue with update even if deletion fails
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        image: image || null, // Explicitly set to null if no image provided
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
} 