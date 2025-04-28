import { auth } from "@/lib/auth";
import { fetchProfile, fetchSavedPosts } from "@/lib/data";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileTabsSkeleton } from "@/components/Skeletons";
import ProfileTabs from "@/components/ProfileTabs";
import { UserWithExtras } from "@/lib/definitions";
import ProfileAvatar from "@/components/ProfileAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";

interface Story {
  id: string;
  fileUrl: string;
  scale: number;
  user_id: string;
  createdAt: Date | string;
}

export default async function SavedPostsPage({
  params,
}: {
  params: { username: string };
}) {
  console.log(`[DEBUG] SavedPostsPage accessed for username: ${params.username}`);
  
  const { username } = params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  console.log(`[DEBUG] Current user ID: ${session.user.id}`);

  const profile = await fetchProfile(username);
  if (!profile) notFound();

  const isCurrentUser = session.user.username === profile.username;
  console.log(`[DEBUG] Is current user: ${isCurrentUser}`);

  // Only the profile owner can see their saved posts
  if (!isCurrentUser) {
    console.log(`[DEBUG] Redirecting non-owner to profile page`);
    redirect(`/dashboard/${username}`);
  }

  // Get valid stories for the profile header
  const validStories = profile.stories?.map((story: Story) => ({
    id: story.id,
    fileUrl: story.fileUrl,
    scale: story.scale,
    user_id: story.user_id,
    createdAt: story.createdAt instanceof Date 
      ? story.createdAt.toISOString() 
      : new Date(story.createdAt).toISOString()
  })) || [];

  // Transform saved posts to match the expected format
  const transformedProfile = {
    ...profile,
    savedPosts: profile.savedPosts || []
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto">
        <section className="w-full h-full flex flex-col md:flex-row items-center gap-x-8 md:gap-x-16 px-6">
          <div className="flex flex-col items-center gap-y-4">
            <ProfileAvatar
              user={transformedProfile as UserWithExtras}
              stories={validStories}
              showModal={true}
            >
              <UserAvatar
                user={profile}
                className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] cursor-pointer"
                priority={true}
              />
            </ProfileAvatar>
          </div>

          <div className="flex flex-col gap-y-4">
            <div className="flex items-center gap-x-4">
              <span className="text-2xl font-semibold">{profile.username}</span>
              {profile.verified && <VerifiedBadge />}
              {isCurrentUser && (
                <Link
                  href="/settings"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Edit Profile
                </Link>
              )}
            </div>

            <div className="flex items-center gap-x-7">
              <span>
                <strong className="font-semibold">{profile.posts.length}</strong>{" "}
                posts
              </span>
              <Link href={`/dashboard/${profile.username}/followers`}>
                <span>
                  <strong className="font-semibold">
                    {profile.followers.filter((f: { status: string }) => f.status === "ACCEPTED").length}
                  </strong>{" "}
                  followers
                </span>
              </Link>
              <Link href={`/dashboard/${profile.username}/following`}>
                <span>
                  <strong className="font-semibold">
                    {profile.following.filter((f: { status: string }) => f.status === "ACCEPTED").length}
                  </strong>{" "}
                  following
                </span>
              </Link>
            </div>

            {profile.name && (
              <span className="font-semibold">{profile.name}</span>
            )}
            {profile.bio && <span>{profile.bio}</span>}
          </div>
        </section>

        <Suspense fallback={<ProfileTabsSkeleton />}>
          <ProfileTabs 
            profile={transformedProfile as UserWithExtras} 
            isCurrentUser={isCurrentUser} 
            defaultTab="saved"
          />
        </Suspense>
      </div>
    </main>
  );
}
