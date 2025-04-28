import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import ReelView from "@/components/reels/ReelView";

interface ReelPageProps {
  params: {
    reelId: string;
  };
}

export default async function ReelPage({ params }: ReelPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Check if reels are enabled
  const reelsSetting = await db.setting.findUnique({
    where: { key: "reelsEnabled" }
  });

  // If reels are disabled, redirect to dashboard
  if (reelsSetting?.value === "false") {
    redirect("/dashboard");
  }

  const reel = await db.reel.findUnique({
    where: {
      id: params.reelId,
      status: "APPROVED" // Only show approved reels
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          verified: true
        }
      },
      likes: {
        where: {
          user_id: session.user.id
        },
        select: {
          user_id: true
        }
      },
      comments: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              verified: true
            }
          }
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    }
  });

  if (!reel) notFound();

  // Increment view count
  try {
    await db.reel.update({
      where: { id: reel.id },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("[VIEW_INCREMENT_ERROR]", error);
  }

  // Format the user object to ensure username is a string
  const formattedUser = {
    id: reel.user.id,
    username: reel.user.username || "",
    name: reel.user.name || "",
    image: reel.user.image,
    verified: reel.user.verified,
  };

  // Map the comments to match the expected format
  const formattedComments = reel.comments.map(comment => ({
    id: comment.id,
    content: comment.body,
    createdAt: comment.createdAt.toISOString(),
    user: {
      id: comment.user.id,
      username: comment.user.username || "",
      name: comment.user.name || "",
      image: comment.user.image,
      verified: comment.user.verified,
    }
  }));

  return (
    <div className="container max-w-7xl py-10">
      <ReelView
        reel={{
          id: reel.id,
          caption: reel.caption,
          fileUrl: reel.fileUrl,
          thumbnail: reel.thumbnail,
          views: reel.views,
          createdAt: reel.createdAt.toISOString(),
          user: formattedUser,
          likes: reel.likes,
          comments: formattedComments,
          likesCount: reel._count.likes,
          commentsCount: reel._count.comments,
        }}
      />
    </div>
  );
} 