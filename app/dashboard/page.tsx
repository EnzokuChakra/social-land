import { Suspense } from "react";
import { fetchPosts, fetchSuggestedUsers, fetchUserStories, fetchOtherStories, fetchProfile } from "@/lib/data";
import Posts from "@/components/Posts";
import { auth } from "@/lib/auth";
import { UserWithExtras, PostWithExtras, StoryWithExtras } from "@/lib/definitions";
import StoryFeed from "@/components/StoryFeed";
import { redirect } from "next/navigation";
import StoryModal from "@/components/modals/StoryModal";
import ProfileCard from "@/components/ProfileCard";
import SuggestionsCard from "@/components/SuggestionsCard";

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
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [posts, suggestedUsers, userStories, otherStories, profile] = await Promise.all([
    fetchPosts(session.user.id),
    fetchSuggestedUsers(session.user.id, 20),
    fetchUserStories(session.user.id),
    fetchOtherStories(session.user.id),
    fetchProfile(session.user.username),
  ]);

  return (
    <div className="flex flex-col md:flex-row max-w-[935px] mx-auto pt-4 md:pt-8 gap-8">
      <div className="flex-grow max-w-[630px] w-full mx-auto md:mx-0">
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-black rounded-lg">
            <StoryFeed userStories={userStories} otherStories={otherStories} />
          </div>
          <Posts posts={posts} />
        </div>
      </div>
      <div className="hidden lg:block w-[320px] flex-shrink-0 pt-4">
        <div className="fixed w-[320px] space-y-6">
          <ProfileCard profile={profile} />
          <SuggestionsCard users={suggestedUsers} />
          <footer className="text-xs text-neutral-500">
          </footer>
        </div>
      </div>
      <StoryModal />
    </div>
  );
} 