"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserWithExtras, SavedPostWithExtras, PostWithExtras, Post, Like, SavedPost, CommentWithExtras, PostTag, User } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Bookmark, Contact, Grid3X3, Lock, ImageIcon, BookmarkX, UserX2 } from "lucide-react";
import PostsGrid from "./PostsGrid";
import { toast } from "react-hot-toast";

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
  const uniqueSavedPosts = profile.savedPosts
    ?.map(savedPost => {
      if (!savedPost.post) {
        return null;
      }
      
      // Transform the post data to include all required fields
      const transformedPost: PostWithExtras = {
        ...savedPost.post,
        likes: savedPost.post.likes || [],
        comments: (savedPost.post.comments || []).map(comment => ({
          ...comment,
          user: {
            ...comment.user,
            hasActiveStory: comment.user.stories && comment.user.stories.length > 0,
            stories: undefined
          },
          replies: (comment.replies || []).map(reply => ({
            ...reply,
            user: {
              ...reply.user,
              hasActiveStory: reply.user.stories && reply.user.stories.length > 0,
              stories: undefined
            }
          }))
        })),
        savedBy: savedPost.post.savedBy || [],
        tags: savedPost.post.tags || [],
        user: {
          ...(savedPost.post.user || profile),
          isFollowing: savedPost.post.user?.isFollowing || false,
          isPrivate: savedPost.post.user?.isPrivate || false,
          hasPendingRequest: savedPost.post.user?.hasPendingRequest || false,
          isFollowedByUser: savedPost.post.user?.isFollowedByUser || false,
          hasActiveStory: savedPost.post.user?.stories && savedPost.post.user.stories.length > 0
        }
      };

      return transformedPost;
    })
    .filter((post): post is PostWithExtras => post !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  // Get tagged posts from profile.postTags
  const taggedPosts = profile.postTags?.map(tag => tag.post) || [];

  const handleTabChange = (value: string) => {
    router.push(`/profile/${profile.id}/${value}`);
  };

  const handleFollow = async () => {
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followingId: profile.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to follow user');
      }

      const data = await response.json();
      if (data.success) {
        // Update the profile state to reflect the new follow
        // This is a placeholder and should be replaced with actual state management
      }
    } catch (error) {
      toast.error('Failed to follow user');
    }
  };

  const handleUnfollow = async () => {
    try {
      const response = await fetch('/api/follow', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followingId: profile.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unfollow user');
      }

      const data = await response.json();
      if (data.success) {
        // Update the profile state to reflect the unfollow
        // This is a placeholder and should be replaced with actual state management
      }
    } catch (error) {
      toast.error('Failed to unfollow user');
    }
  };

  return (
    <div>
      <Tabs defaultValue={defaultTab} className="pt-4 md:pt-16">
        <TabsList className="flex justify-center w-full h-auto p-0 bg-transparent border-t border-b border-neutral-200 dark:border-neutral-800">
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-12 pt-3 pb-3 rounded-none border-t-2 -mt-[1px] border-transparent transition-colors",
                "hover:bg-neutral-50 dark:hover:bg-neutral-900/50",
                "data-[state=active]:border-neutral-700 dark:data-[state=active]:border-neutral-200",
              )}
            >
              <div className="flex items-center justify-center md:justify-start gap-2">
                <tab.Icon className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  {tab.title}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="posts" className="mt-0.5">
          {(!ownPosts || ownPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ImageIcon className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">No Posts Yet</h1>
              <p className="text-neutral-500 max-w-sm">
                When you share photos, they will appear here.
              </p>
            </div>
          ) : (
            <PostsGrid posts={ownPosts} />
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-0.5">
          {(!uniqueSavedPosts || uniqueSavedPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookmarkX className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">No Saved Posts</h1>
              <p className="text-neutral-500 max-w-sm">
                Save photos and videos that you want to see again.
              </p>
            </div>
          ) : (
            <PostsGrid posts={uniqueSavedPosts} />
          )}
        </TabsContent>

        <TabsContent value="tagged" className="mt-0.5">
          {(!taggedPosts || taggedPosts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserX2 className="w-12 h-12 text-neutral-500 mb-4" />
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
