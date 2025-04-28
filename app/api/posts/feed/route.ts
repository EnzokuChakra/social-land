import { auth } from "@/lib/auth";
import { fetchPosts } from "@/lib/data";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const { posts, hasMore } = await fetchPosts(session.user.id, page, limit);

    return NextResponse.json({
      posts,
      hasMore,
      page
    });
  } catch (error) {
    console.error("[POSTS_FEED_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 