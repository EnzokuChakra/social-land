import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/definitions";
import { PrismaClient } from "@prisma/client";

// Type declaration for the PrismaClient to include the Setting model
declare global {
  namespace PrismaClient {
    interface PrismaClient {
      setting: {
        findUnique: (args: { where: { key: string } }) => Promise<{ value: string } | null>;
        upsert: (args: {
          where: { key: string };
          update: { value: string };
          create: { key: string; value: string };
        }) => Promise<{ value: string }>;
      };
    }
  }
}

// Get maintenance mode status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow any authenticated user to check maintenance status
    if (!session?.user) {
      return NextResponse.json({ maintenanceMode: false }, { status: 401 });
    }
    
    // Get maintenance settings from database
    const maintenanceMode = await db.setting.findUnique({
      where: { key: "maintenanceMode" }
    });
    
    const estimatedTime = await db.setting.findUnique({
      where: { key: "maintenanceEstimatedTime" }
    });
    
    const message = await db.setting.findUnique({
      where: { key: "maintenanceMessage" }
    });
    
    return NextResponse.json({
      maintenanceMode: maintenanceMode?.value === "true",
      estimatedTime: estimatedTime?.value || "2:00",
      message: message?.value || "We're making some improvements to bring you a better experience. We'll be back shortly!"
    });
  } catch (error) {
    console.error("[MAINTENANCE_GET]", error);
    return NextResponse.json({ maintenanceMode: false }, { status: 500 });
  }
}

// Update maintenance mode
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only MASTER_ADMIN can update maintenance settings
    if (!session?.user || session.user.role !== "MASTER_ADMIN") {
      return NextResponse.json(
        { error: "You don't have permission to update maintenance settings" }, 
        { status: 403 }
      );
    }
    
    const { maintenanceMode, estimatedTime, message } = await request.json();
    
    console.log(`[MAINTENANCE] Updating maintenance mode to: ${maintenanceMode}`);
    
    // Update maintenance mode
    await db.setting.upsert({
      where: { key: "maintenanceMode" },
      update: { value: String(maintenanceMode) },
      create: { key: "maintenanceMode", value: String(maintenanceMode) }
    });
    
    // Update estimated time
    await db.setting.upsert({
      where: { key: "maintenanceEstimatedTime" },
      update: { value: estimatedTime },
      create: { key: "maintenanceEstimatedTime", value: estimatedTime }
    });
    
    // Update message
    await db.setting.upsert({
      where: { key: "maintenanceMessage" },
      update: { value: message },
      create: { key: "maintenanceMessage", value: message }
    });
    
    console.log(`[MAINTENANCE] Settings updated successfully. Maintenance mode: ${maintenanceMode}`);
    
    return NextResponse.json({ 
      success: true,
      maintenanceMode: maintenanceMode
    });
  } catch (error) {
    console.error("[MAINTENANCE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 