import { auth } from "@/lib/auth";
import { fetchProfile } from "@/lib/data";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UpdateUser } from "@/lib/schemas";
import { z } from "zod";
import { checkUserBanStatus } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      console.error("[PROFILE_GET] No authenticated user found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user is banned
    const isBanned = await checkUserBanStatus(session.user.id);
    if (isBanned) {
      console.error("[PROFILE_GET] User is banned:", session.user.id);
      return new NextResponse("Account is banned", { status: 403 });
    }

    const profile = await fetchProfile(session.user.username);
    if (!profile) {
      console.error("[PROFILE_GET] Profile not found for username:", session.user.username);
      return new NextResponse("Profile not found", { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[PROFILE_GET] Server error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedFields = UpdateUser.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: validatedFields.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, image, bio, isPrivate } = validatedFields.data;

    // Update the user profile
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name,
        image,
        bio,
        isPrivate
      }
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        image: updatedUser.image,
        bio: updatedUser.bio,
        isPrivate: updatedUser.isPrivate
      }
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
} 