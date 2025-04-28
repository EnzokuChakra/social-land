import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/definitions";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    if (!["ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || undefined;

    // Calculate offset
    const skip = (page - 1) * limit;

    // Build where clause with improved search
    const where = {
      AND: [
        // Search across multiple fields if search term exists
        search ? {
          OR: [
            { username: { contains: search.toLowerCase() } },
            { name: { contains: search.toLowerCase() } },
            { email: { contains: search.toLowerCase() } },
          ],
        } : {},
        // Filter by role if specified
        role ? { role } : {},
      ],
    };

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [
          { role: 'asc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
          verified: true,
          status: true,
          createdAt: true,
          isPrivate: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[ADMIN_USERS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userRole = session.user.role as UserRole;
    if (!["ADMIN", "MASTER_ADMIN"].includes(userRole)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const { userId, action, newRole } = body;

    // Verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Only MASTER_ADMIN can modify ADMIN roles
    if (targetUser.role === "ADMIN" && userRole !== "MASTER_ADMIN") {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }

    switch (action) {
      case "promote":
        if (userRole !== "MASTER_ADMIN") {
          return new NextResponse("Only MASTER_ADMIN can promote users", { status: 403 });
        }
        await prisma.user.update({
          where: { id: userId },
          data: { role: newRole },
        });
        break;

      case "demote":
        if (userRole !== "MASTER_ADMIN") {
          return new NextResponse("Only MASTER_ADMIN can demote users", { status: 403 });
        }
        await prisma.user.update({
          where: { id: userId },
          data: { role: "USER" },
        });
        break;

      case "ban":
        // Add banned field to schema if not exists
        await prisma.user.update({
          where: { id: userId },
          data: { verified: false },
        });
        break;

      case "delete":
        if (userRole !== "MASTER_ADMIN") {
          return new NextResponse("Only MASTER_ADMIN can delete users", { status: 403 });
        }
        await prisma.user.delete({
          where: { id: userId },
        });
        break;

      default:
        return new NextResponse("Invalid action", { status: 400 });
    }

    return new NextResponse("Success", { status: 200 });
  } catch (error) {
    console.error("[ADMIN_USERS_ACTION]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 