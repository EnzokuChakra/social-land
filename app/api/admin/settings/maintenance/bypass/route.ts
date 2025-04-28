import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MAINTENANCE_COOKIE, MAINTENANCE_BYPASS_TOKEN } from "@/lib/maintenance";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (token === MAINTENANCE_BYPASS_TOKEN) {
      // Set the bypass cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: MAINTENANCE_COOKIE,
        value: MAINTENANCE_BYPASS_TOKEN,
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Error setting maintenance bypass cookie:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
} 