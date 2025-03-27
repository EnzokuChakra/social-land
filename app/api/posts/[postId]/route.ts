import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/server-utils";
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

    const post = await db.post.findUnique({
      where: {
        id: params.postId,
      },
      select: {
        user_id: true,
        fileUrl: true,
      },
    });

    if (!post) {
      return new NextResponse("Post not found", { status: 404 });
    }

    if (post.user_id !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete the file first
    await deleteUploadedFile(post.fileUrl);

    // Then delete the database record
    await db.post.delete({
      where: {
        id: params.postId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 