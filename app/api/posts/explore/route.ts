import { auth } from "@/lib/auth";
import { fetchRankedExplorePosts } from "@/lib/data";
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
    const limit = parseInt(searchParams.get("limit") || "24"); // Show 24 posts per page

    // Use the new ranking function
    const { posts, hasMore, page: currentPage } = await fetchRankedExplorePosts(
      session.user.id,
      page,
      limit
    );

    return NextResponse.json({
      posts,
      hasMore,
      page: currentPage
    });
  } catch (error) {
    console.error("[EXPLORE_POSTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 