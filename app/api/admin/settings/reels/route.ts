import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/definitions";

// Get reels visibility status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow any authenticated user to check reels visibility status
    if (!session?.user) {
      return NextResponse.json({ reelsEnabled: false }, { status: 401 });
    }
    
    // Get reels visibility setting from database
    const reelsSetting = await db.setting.findUnique({
      where: { key: "reelsEnabled" }
    });
    
    // Default to disabled if setting doesn't exist
    return NextResponse.json({
      reelsEnabled: reelsSetting?.value === "true"
    });
  } catch (error) {
    console.error("[REELS_VISIBILITY_GET]", error);
    return NextResponse.json({ reelsEnabled: false }, { status: 500 });
  }
}

// Update reels visibility
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only ADMIN or MASTER_ADMIN can update reels visibility settings
    if (!session?.user || !["ADMIN", "MASTER_ADMIN"].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "You don't have permission to update reels settings" }, 
        { status: 403 }
      );
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 