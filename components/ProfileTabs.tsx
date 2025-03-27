"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserWithExtras, SavedPostWithExtras, PostWithExtras, Post, Like, SavedPost, CommentWithExtras, PostTag, User } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Bookmark, Contact, Grid3X3 } from "lucide-react";
import { Lock } from "lucide-react";
import PostsGrid from "./PostsGrid";

const profileTabs = [
  {
    title: "Posts",
    value: "posts",
    Icon: Grid3X3,
  },
  {
    title: "Saved",
    value: "saved",
    Icon: Bookmark,
  },
  {
    title: "Tagged",
    value: "tagged",
    Icon: Contact,
  },
];

function ProfileTabs({
  profile,
  isCurrentUser,
  defaultTab = "posts",
}: {
  profile: UserWithExtras;
  isCurrentUser: boolean;
  defaultTab?: "posts" | "saved" | "tagged";
}) {
  const router = useRouter();

  // Filter tabs based on conditions
  const filteredTabs = profileTabs.filter((tab) => {
    // Hide saved tab for non-current users
    if (!isCurrentUser && tab.value === "saved") return false;
    return true;
  });

  // Filter posts for each tab
  const ownPosts = profile.posts.filter(post => post.user_id === profile.id);
  
  // Transform saved posts and remove duplicates
  const uniqueSavedPosts = (profile.saved || []).map((savedPost: SavedPostWithExtras) => {
    const post = savedPost.post as PostWithExtras;
    return {
      ...post,
      user: post.user || profile,
      likes: post.likes || [],
      comments: post.comments || [],
      savedBy: post.savedBy || [],
      tags: post.tags || []
    } as PostWithExtras;
  });

  // Get tagged posts (posts where the user is tagged)
  const taggedPosts = profile.posts.filter(post => 
    (post.tags ?? []).some(tag => tag.userId === profile.id) && post.user_id !== profile.id
  );

  return (
    <div>
      <Tabs defaultValue={defaultTab} className="pt-14 md:pt-32">
        <TabsList className="flex justify-center w-full h-auto p-0 bg-transparent border-t border-b border-neutral-200 dark:border-neutral-800">
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "px-12 pt-4 pb-4 rounded-none border-t-2 -mt-[1px] border-transparent transition-colors",
                "hover:bg-neutral-50 dark:hover:bg-neutral-900/50",
                "data-[state=active]:border-neutral-700 dark:data-[state=active]:border-neutral-200",
              )}
            >
              <div className="flex items-center gap-2">
                <tab.Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  {tab.title}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          {(!ownPosts || ownPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Lock className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">No Posts Yet</h1>
              <p className="text-neutral-500 max-w-sm">
                When you share photos, they will appear here.
              </p>
            </div>
          ) : (
            <PostsGrid posts={ownPosts} />
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {(!uniqueSavedPosts || uniqueSavedPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Lock className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">No Saved Posts</h1>
              <p className="text-neutral-500 max-w-sm">
                Save photos and videos that you want to see again.
              </p>
            </div>
          ) : (
            <PostsGrid posts={uniqueSavedPosts} />
          )}
        </TabsContent>

        <TabsContent value="tagged" className="mt-6">
          {(!taggedPosts || taggedPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Lock className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">No Tagged Posts</h1>
              <p className="text-neutral-500 max-w-sm">
                When people tag you in posts, they'll appear here.
              </p>
            </div>
          ) : (
            <PostsGrid posts={taggedPosts} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProfileTabs;
