import { Suspense } from "react";
import { fetchPosts, fetchSuggestedUsers, fetchUserStories, fetchOtherStories, fetchProfile } from "@/lib/data";
import { auth } from "@/lib/auth";
import Posts from "@/components/Posts";
import StoryFeed from "@/components/StoryFeed";
import { redirect } from "next/navigation";
import StoryModal from "@/components/modals/StoryModal";
import ProfileCard from "@/components/ProfileCard";
import SuggestionsCard from "@/components/SuggestionsCard";
import DashboardRevalidation from "@/components/DashboardRevalidation";
import { transformStory, transformUser } from "@/lib/utils";

// Force dynamic rendering and disable cache
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata = {
  title: "Dashboard",
  description: "View your personalized feed",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Make sure we have a username to fetch the profile
  const username = session.user.username || "";
  if (!username) {
    redirect("/onboarding");
  }

  const [posts, suggestedUsers, userStories, otherStories, profile] = await Promise.all([
    fetchPosts(session.user.id, 1, 10), // Only fetch first 10 posts initially
    fetchSuggestedUsers(session.user.id, 20),
    fetchUserStories(session.user.id),
    fetchOtherStories(session.user.id),
    fetchProfile(username),
  ]);

  // Transform the data to match the expected types
  const transformedUserStories = userStories?.map(transformStory) || [];
  const transformedOtherStories = otherStories?.map(transformStory) || [];
  const transformedProfile = profile ? transformUser(profile) : undefined;
  const transformedSuggestedUsers = suggestedUsers?.map(transformUser) || [];

  // Get initial posts
  const initialPosts = Array.isArray(posts) ? posts : posts.posts;

  return (
    <DashboardRevalidation userId={session.user.id}>
      <div className="flex flex-col md:flex-row max-w-[935px] mx-auto pt-4 md:pt-8 gap-8">
        <div className="flex-grow max-w-[630px] w-full mx-auto md:mx-0">
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-black rounded-lg">
              <StoryFeed 
                userStories={transformedUserStories} 
                otherStories={transformedOtherStories} 
              />
            </div>
            <Posts initialPosts={initialPosts} />
          </div>
        </div>
        <div className="hidden lg:block w-[320px] flex-shrink-0 pt-4">
          <div className="fixed w-[320px] space-y-6">
            {transformedProfile && <ProfileCard profile={transformedProfile} />}
            <SuggestionsCard users={transformedSuggestedUsers} />
            <footer className="text-xs text-neutral-500">
            </footer>
          </div>
        </div>
        <StoryModal />
      </div>
    </DashboardRevalidation>
  );
} 