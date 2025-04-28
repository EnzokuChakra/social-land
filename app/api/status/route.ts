import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Get maintenance mode status - public endpoint
export async function GET() {
  try {
    // Get maintenance settings from database
    const maintenanceMode = await db.setting.findUnique({
      where: { key: "maintenanceMode" }
    });
    
    return NextResponse.json({
      maintenanceMode: maintenanceMode?.value === "true",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[STATUS_GET]", error);
    return NextResponse.json({ 
      maintenanceMode: false,
      error: "Error checking maintenance status"
    }, { status: 500 });
  }
} 