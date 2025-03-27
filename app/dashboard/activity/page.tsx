import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserActivity } from "@/lib/data";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Heart, MessageCircle, Bookmark } from "lucide-react";

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const activity = await getUserActivity(session.user.id);

  return (
    <div className="flex flex-col items-center min-h-screen bg-background">
      <div className="w-full max-w-4xl p-4 md:p-6 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Your Activity</h1>
          <p className="text-muted-foreground text-center">
            Track your interactions across posts and content
          </p>
        </div>

        <Tabs defaultValue="likes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="likes" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Likes</span>
              <span className="text-muted-foreground">({activity.likes.length})</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Comments</span>
              <span className="text-muted-foreground">({activity.comments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Saved</span>
              <span className="text-muted-foreground">({activity.savedPosts.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="likes" className="mt-6">
            <ScrollArea className="h-[600px] rounded-md border p-4">
              <div className="space-y-4">
                {activity.likes.map((like) => (
                  <Link 
                    key={like.id}
                    href={`/dashboard/p/${like.post?.id}`}
                    className="flex items-start space-x-4 p-4 rounded-lg hover:bg-accent transition"
                  >
                    <UserAvatar
                      user={like.post?.user}
                      className="h-10 w-10"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        You liked a post by{" "}
                        <span className="font-semibold">
                          {like.post?.user.username}
                        </span>
                        {like.post?.user.verified && (
                          <VerifiedBadge className="h-4 w-4 inline ml-1" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(like.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
                {activity.likes.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    No likes yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <ScrollArea className="h-[600px] rounded-md border p-4">
              <div className="space-y-4">
                {activity.comments.map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/dashboard/p/${comment.post?.id}`}
                    className="flex items-start space-x-4 p-4 rounded-lg hover:bg-accent transition"
                  >
                    <UserAvatar
                      user={comment.post?.user}
                      className="h-10 w-10"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        You commented on {comment.post?.user.username}'s post
                        {comment.post?.user.verified && (
                          <VerifiedBadge className="h-4 w-4 inline ml-1" />
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground italic">
                        "{comment.body}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
                {activity.comments.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    No comments yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            <ScrollArea className="h-[600px] rounded-md border p-4">
              <div className="space-y-4">
                {activity.savedPosts.map((saved) => (
                  <Link
                    key={saved.id}
                    href={`/dashboard/p/${saved.post?.id}`}
                    className="flex items-start space-x-4 p-4 rounded-lg hover:bg-accent transition"
                  >
                    <UserAvatar
                      user={saved.post?.user}
                      className="h-10 w-10"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        You saved a post by{" "}
                        <span className="font-semibold">
                          {saved.post?.user.username}
                        </span>
                        {saved.post?.user.verified && (
                          <VerifiedBadge className="h-4 w-4 inline ml-1" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(saved.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
                {activity.savedPosts.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    No saved posts yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 