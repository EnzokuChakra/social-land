"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { Grid3X3, Bookmark, Contact, ImageIcon, BookmarkX, UserX2 } from "lucide-react";
import PostsGrid from "./PostsGrid";

interface ProfileTabsProps {
  posts: PostWithExtras[];
  reels: PostWithExtras[];
  reelsEnabled: boolean;
  isCurrentUser: boolean;
  username: string;
  defaultTab?: "posts" | "saved" | "tagged";
}

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
  posts,
  reels,
  reelsEnabled,
  isCurrentUser,
  username,
  defaultTab = "posts",
}: ProfileTabsProps) {
  // Filter tabs based on conditions
  const filteredTabs = profileTabs.filter((tab) => {
    // Hide saved tab for non-current users
    if (!isCurrentUser && tab.value === "saved") return false;
    return true;
  });

  // Filter posts for each tab
  const ownPosts = posts.filter(post => post.user.username === username);
  const savedPosts = posts.filter(post => post.savedBy?.some(save => save.user_id === post.user_id));
  const taggedPosts = posts.filter(post => post.tags?.some(tag => tag.userId === username));

  return (
    <div>
      <Tabs defaultValue={defaultTab} className="pt-4 md:pt-8">
        <TabsList className="flex justify-center w-full h-auto p-0 bg-transparent border-t border-b border-neutral-200 dark:border-neutral-800">
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex-1 px-4 py-3 rounded-none border-t-2 -mt-[1px] border-transparent transition-colors",
                "hover:bg-neutral-50 dark:hover:bg-neutral-900/50",
                "data-[state=active]:border-neutral-700 dark:data-[state=active]:border-neutral-200",
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <tab.Icon className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span className="text-xs font-semibold tracking-wider uppercase hidden md:inline">
                  {tab.title}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          {(!ownPosts || ownPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold mb-2">No Posts Yet</h1>
              <p className="text-sm md:text-base text-neutral-500 max-w-sm px-4">
                When you share photos, they will appear here.
              </p>
            </div>
          ) : (
            <PostsGrid posts={ownPosts} />
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-0">
          {(!savedPosts || savedPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookmarkX className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold mb-2">No Saved Posts</h1>
              <p className="text-sm md:text-base text-neutral-500 max-w-sm px-4">
                Save photos and videos that you want to see again.
              </p>
            </div>
          ) : (
            <PostsGrid posts={savedPosts} />
          )}
        </TabsContent>

        <TabsContent value="tagged" className="mt-0">
          {(!taggedPosts || taggedPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserX2 className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold mb-2">No Tagged Posts</h1>
              <p className="text-sm md:text-base text-neutral-500 max-w-sm px-4">
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
