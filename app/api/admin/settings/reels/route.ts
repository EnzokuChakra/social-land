import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/definitions";

// Get reels visibility status
export async function GET() {
  try {
    const session = await auth();
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!["ADMIN", "MASTER_ADMIN"].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    try {
      // Get reels visibility setting from database
      const reelsSetting = await db.setting.findUnique({
        where: { key: "reelsEnabled" }
      });
      
      // Default to disabled if setting doesn't exist
      return NextResponse.json({
        reelsEnabled: reelsSetting?.value === "true"
      });
    } catch (dbError) {
      console.error("[REELS_VISIBILITY_GET] Database error:", dbError);
      return new NextResponse("Database Error", { status: 500 });
    }
  } catch (error) {
    console.error("[REELS_VISIBILITY_GET] Server error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Update reels visibility
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Only ADMIN or MASTER_ADMIN can update reels visibility settings
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!["ADMIN", "MASTER_ADMIN"].includes(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    const { reelsEnabled } = await request.json();
    
    console.log(`[REELS_VISIBILITY] Updating reels visibility to: ${reelsEnabled}`);
    
    // Update reels visibility setting
    await db.setting.upsert({
      where: { key: "reelsEnabled" },
      update: { value: String(reelsEnabled) },
      create: { key: "reelsEnabled", value: String(reelsEnabled) }
    });
    
    return NextResponse.json({ 
      success: true,
      reelsEnabled: reelsEnabled
    });
  } catch (error) {
    console.error("[REELS_VISIBILITY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 