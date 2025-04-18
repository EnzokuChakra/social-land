import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/server-utils";
import { fetchPostById } from "@/lib/data";
import { deletePost } from "@/lib/actions";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await deletePost(params.postId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST_DELETE]", error);
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const post = await fetchPostById(params.postId);
    if (!post) {
      return new NextResponse("Post not found", { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("[POST_GET]", error);
    return new NextResponse(
      "Internal Error",
      { status: 500 }
    );
  }
} 