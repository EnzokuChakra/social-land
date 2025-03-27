import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get reels visibility setting from database
    const reelsSetting = await db.setting.findUnique({
      where: { key: "reelsEnabled" }
    });
    
    // Return the setting value, defaulting to false if not found
    return NextResponse.json({
      value: reelsSetting?.value ?? "false"
    });
  } catch (error) {
    console.error("[REELS_SETTING_GET]", error);
    // Default to false on error
    return NextResponse.json({ value: "false" });
  }
} 