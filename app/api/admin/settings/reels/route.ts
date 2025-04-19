import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/definitions";
import { v4 as uuidv4 } from 'uuid';

// Get reels visibility status
export async function GET() {
  try {
    if (!db) {
      console.error("[REELS_VISIBILITY_GET] Database connection not available");
      return new NextResponse("Database Error", { status: 500 });
    }

    const session = await auth();
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role as string;
    if (!["ADMIN", "MASTER_ADMIN"].includes(userRole)) {
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
    console.log("[REELS_VISIBILITY_POST] Starting update...");
    
    if (!db) {
      console.error("[REELS_VISIBILITY_POST] Database connection not available");
      return new NextResponse("Database Error", { status: 500 });
    }

    const session = await auth();
    
    // Only ADMIN or MASTER_ADMIN can update reels visibility settings
    if (!session?.user) {
      console.log("[REELS_VISIBILITY_POST] Unauthorized: No session");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role as string;
    if (!["ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      console.log("[REELS_VISIBILITY_POST] Forbidden: Invalid role", userRole);
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    const { reelsEnabled } = await request.json();
    
    console.log(`[REELS_VISIBILITY_POST] Updating reels visibility to: ${reelsEnabled}`);
    
    // First try to find existing setting
    const existingSetting = await db.setting.findUnique({
      where: { key: "reelsEnabled" }
    });

    if (existingSetting) {
      // Update existing setting
      console.log("[REELS_VISIBILITY_POST] Updating existing setting...");
      await db.setting.update({
        where: { id: existingSetting.id },
        data: { value: String(reelsEnabled) }
      });
    } else {
      // Create new setting
      console.log("[REELS_VISIBILITY_POST] Creating new setting...");
      await db.setting.create({
        data: {
          id: uuidv4(),
          key: "reelsEnabled",
          value: String(reelsEnabled),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    console.log("[REELS_VISIBILITY_POST] Update successful");
    return NextResponse.json({ 
      success: true,
      reelsEnabled: reelsEnabled
    });
  } catch (error) {
    console.error("[REELS_VISIBILITY_POST] Error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Failed to update reels visibility",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      { status: 500 }
    );
  }
} 