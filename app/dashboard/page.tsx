import { Suspense } from "react";
import { fetchPosts, fetchSuggestedUsers, fetchUserStories, fetchOtherStories, fetchProfile } from "@/lib/data";
import Posts from "@/components/Posts";
import { PostsSkeleton } from "@/components/Skeletons";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { user, like, storyview, follows } from "@prisma/client";
import { UserWithExtras, PostWithExtras, StoryWithExtras, SavedPostWithExtras, FollowerWithExtras, FollowingWithExtras, UserRole, UserStatus, CommentWithExtras } from "@/lib/definitions";
import Post from "@/components/Post";
import StoryFeed from "@/components/StoryFeed";
import { redirect } from "next/navigation";
import { PostsSkeleton as LoadingSkeleton } from "@/components/Skeletons";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import StoryModal from "@/components/modals/StoryModal";
import ProfileCard from "@/components/ProfileCard";
import SuggestionsCard from "@/components/SuggestionsCard";
import Link from "next/link";
import { signOut } from "next-auth/react";
import PageLayout from "@/components/PageLayout";

// Force dynamic rendering and disable cache
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Add metadata configuration for cache control
export const metadata = {
  headers: {
    'Cache-Control': 'no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export default async function DashboardPage() {
  // Ensure session is fully loaded
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const session = await auth();

  if (!session?.user?.username) {
    redirect("/login");
  }

  // Add session check logging
  console.log("Session check:", {
    userId: session.user.id,
    username: session.user.username,
    timestamp: new Date().toISOString()
  });

  try {
    // Fetch data with error handling and logging
    console.log("Starting data fetch for user:", session.user.username);
    
    const [profileResult, postsResult, suggestedUsersResult, userStoriesResult, otherStoriesResult] = await Promise.allSettled([
      fetchProfile(session.user.username),
      fetchPosts(),
      fetchSuggestedUsers(session.user.id),
      fetchUserStories(session.user.id),
      fetchOtherStories(session.user.id),
    ]);

    // Log fetch results
    console.log("Fetch results:", {
      profile: profileResult.status,
      posts: postsResult.status,
      suggestedUsers: suggestedUsersResult.status,
      userStories: userStoriesResult.status,
      otherStories: otherStoriesResult.status
    });

    // Handle potential failures
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const posts = postsResult.status === 'fulfilled' ? postsResult.value : [];
    const suggestedUsers = suggestedUsersResult.status === 'fulfilled' ? suggestedUsersResult.value : [];
    const userStories = userStoriesResult.status === 'fulfilled' ? userStoriesResult.value : [];
    const otherStories = otherStoriesResult.status === 'fulfilled' ? otherStoriesResult.value : [];

    // Ensure we have a valid profile
    if (!profile) {
      console.error("Profile not found, redirecting to login");
      redirect("/login");
    }

    const user = {
      ...session.user,
      verified: profile.verified || false
    };

    // Transform stories to match StoryWithExtras type
    const transformedUserStories = userStories.map(story => ({
      ...story,
      user: {
        ...story.user,
        name: null,
        email: "",
        password: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        id: story.user.id,
        username: story.user.username,
        image: story.user.image,
        verified: story.user.verified
      } as user,
      likes: story.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          name: null,
          email: "",
          password: null,
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: false
        } as user
      })),
      views: story.views.map(view => ({
        ...view,
        user: {
          ...view.user,
          name: null,
          email: "",
          password: null,
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: false
        } as user
      }))
    })) as StoryWithExtras[];

    const transformedOtherStories = otherStories.map(story => ({
      ...story,
      user: {
        ...story.user,
        name: null,
        email: "",
        password: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        id: story.user.id,
        username: story.user.username,
        image: story.user.image,
        verified: story.user.verified
      } as user,
      likes: story.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          name: null,
          email: "",
          password: null,
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: false
        } as user
      })),
      views: story.views.map(view => ({
        ...view,
        user: {
          ...view.user,
          name: null,
          email: "",
          password: null,
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: false
        } as user
      }))
    })) as StoryWithExtras[];

    // Transform posts to include all required User fields
    const transformedPosts = posts.map(post => ({
      ...post,
      user: {
        ...post.user,
        name: null,
        email: "",
        password: "",
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPrivate: false,
        verified: post.user.verified,
        role: 'USER' as UserRole,
        status: 'NORMAL' as UserStatus
      } as user,
      comments: post.comments.map(comment => ({
        ...comment,
        user: {
          ...comment.user,
          name: null,
          email: "",
          password: "",
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: comment.user.verified,
          role: 'USER' as UserRole,
          status: 'NORMAL' as UserStatus
        } as user,
        likes: [], // Initialize empty likes array for comments
        replies: comment.replies?.map(reply => ({
          ...reply,
          user: {
            ...reply.user,
            name: null,
            email: "",
            password: "",
            bio: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            isPrivate: false,
            verified: reply.user.verified,
            role: 'USER' as UserRole,
            status: 'NORMAL' as UserStatus
          } as user,
          likes: [], // Initialize empty likes array for replies
          replies: [], // Initialize empty replies array
          parentId: reply.parentId
        })) || []
      })) as CommentWithExtras[],
      likes: post.likes.map(like => ({
        ...like,
        user: {
          ...like.user,
          name: null,
          email: "",
          password: "",
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: like.user.verified,
          role: 'USER' as UserRole,
          status: 'NORMAL' as UserStatus
        } as user
      })),
      savedBy: post.savedBy.map(saved => ({
        ...saved,
        user: {
          ...saved.user,
          name: null,
          email: "",
          password: "",
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPrivate: false,
          verified: saved.user.verified,
          role: 'USER' as UserRole,
          status: 'NORMAL' as UserStatus
        } as user
      })),
      tags: [] // Initialize empty tags array
    })) as PostWithExtras[];

    // Transform suggested users to match UserWithExtras type
    const transformedSuggestedUsers = (suggestedUsers || []).map(suggestedUser => {
      // Get the base user data
      const baseUser = {
        id: suggestedUser.id,
        name: suggestedUser.name,
        email: `${suggestedUser.username || suggestedUser.id}@example.com`,
        username: suggestedUser.username,
        password: null,
        image: suggestedUser.image,
        bio: suggestedUser.bio,
        verified: suggestedUser.verified || false,
        isPrivate: suggestedUser.isPrivate || false,
        role: "USER" as UserRole,
        status: "NORMAL" as UserStatus,
        createdAt: suggestedUser.createdAt || new Date(),
        updatedAt: suggestedUser.updatedAt || new Date(),
        posts: [],
        saved: [],
        stories: []
      };

      // Transform followers array with safe defaults
      const followers = (suggestedUser.followers || []).map(f => {
        const followerId = f.followerId;
        return {
          id: followerId,
          username: "",
          name: null,
          image: null,
          verified: false,
          isPrivate: false,
          followerId: followerId,
          followingId: suggestedUser.id,
          status: f.status as "ACCEPTED" | "PENDING",
          isFollowing: false,
          hasPendingRequest: false,
          uniqueId: `${followerId}-${suggestedUser.id}`,
          follower: {
            id: followerId,
            username: "",
            name: null,
            image: null,
            verified: false,
            isPrivate: false,
            isFollowing: false,
            hasPendingRequest: false
          }
        };
      });

      // Transform following array with safe defaults
      const following = (suggestedUser.following || []).map(f => ({
        id: f.followingId,
        username: "",
        name: null,
        image: null,
        verified: false,
        isPrivate: false,
        followerId: suggestedUser.id,
        followingId: f.followingId,
        status: f.status as "ACCEPTED" | "PENDING",
        isFollowing: false,
        hasPendingRequest: false,
        uniqueId: `${suggestedUser.id}-${f.followingId}`,
        following: {
          id: f.followingId,
          username: "",
          name: null,
          image: null,
          verified: false,
          isPrivate: false,
          isFollowing: false,
          hasPendingRequest: false
        }
      }));

      return {
        ...baseUser,
        followers,
        following,
        followersCount: followers.length,
        followingCount: following.length,
        isFollowing: false,
        hasPendingRequest: false,
        isFollowedByUser: false
      };
    });

    return (
      <PageLayout>
        <div className="flex flex-col items-center bg-white dark:bg-black" suppressHydrationWarning>
          <div className="flex max-w-[1100px] w-full gap-8 py-6" suppressHydrationWarning>
            {/* Main content */}
            <div className="flex-grow w-full max-w-[630px] mx-auto lg:mx-0 space-y-6" suppressHydrationWarning>
              {/* Stories */}
              <Suspense fallback={<div className="h-[110px] bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />}>
                <div className="bg-white dark:bg-black rounded-xl" suppressHydrationWarning>
                  <StoryFeed 
                    userStories={transformedUserStories}
                    otherStories={transformedOtherStories}
                  />
                </div>
              </Suspense>

              {/* Posts */}
              <Suspense fallback={<LoadingSkeleton />}>
                <div className="space-y-6" suppressHydrationWarning>
                  <div className="flex flex-col gap-6" suppressHydrationWarning>
                    {transformedPosts.map((post) => (
                      <Post key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              </Suspense>
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block w-[360px] flex-shrink-0" suppressHydrationWarning>
              <div className="fixed w-[360px] space-y-4" suppressHydrationWarning>
                {/* User profile */}
                <Suspense fallback={<div className="h-[65px] bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />}>
                  {profile && <ProfileCard profile={profile} />}
                </Suspense>

                {/* Suggestions */}
                <Suspense fallback={<div className="h-[400px] bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />}>
                  <SuggestionsCard users={transformedSuggestedUsers} />
                </Suspense>

                {/* Footer */}
                <footer className="mt-6">
                  <div className="flex flex-col space-y-4 text-xs text-neutral-500" suppressHydrationWarning>
                    {/* Footer content */}
                  </div>
                </footer>
              </div>
            </div>
          </div>

          {/* Story Modal */}
          <StoryModal />
        </div>
      </PageLayout>
    );
  } catch (error) {
    console.error("Error loading dashboard page:", error);
    return (
      <PageLayout>
        <div className="flex flex-col items-center bg-white dark:bg-black" suppressHydrationWarning>
          <div className="flex max-w-[1100px] w-full gap-8 py-6" suppressHydrationWarning>
            {/* Main content */}
            <div className="flex-grow w-full max-w-[630px] mx-auto lg:mx-0 space-y-6" suppressHydrationWarning>
              {/* Stories */}
              <Suspense fallback={<div className="h-[110px] bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />}>
                <div className="bg-white dark:bg-black rounded-xl" suppressHydrationWarning>
                  <StoryFeed 
                    userStories={[]}
                    otherStories={[]}
                  />
                </div>
              </Suspense>

              {/* Posts */}
              <Suspense fallback={<LoadingSkeleton />}>
                <div className="space-y-6" suppressHydrationWarning>
                  <div className="flex flex-col gap-6" suppressHydrationWarning>
                    {/* Placeholder for error message */}
                  </div>
                </div>
              </Suspense>
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block w-[360px] flex-shrink-0" suppressHydrationWarning>
              <div className="fixed w-[360px] space-y-4" suppressHydrationWarning>
                {/* User profile */}
                <Suspense fallback={<div className="h-[65px] bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />}>
                  {/* Placeholder for error message */}
                </Suspense>

                {/* Suggestions */}
                <Suspense fallback={<div className="h-[400px] bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />}>
                  {/* Placeholder for error message */}
                </Suspense>

                {/* Footer */}
                <footer className="mt-6">
                  <div className="flex flex-col space-y-4 text-xs text-neutral-500" suppressHydrationWarning>
                    {/* Placeholder for error message */}
                  </div>
                </footer>
              </div>
            </div>
          </div>

          {/* Story Modal */}
          <StoryModal />
        </div>
      </PageLayout>
    );
  }
} 