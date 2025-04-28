import { auth } from "@/lib/auth";
import { fetchProfile } from "@/lib/data";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileTabsSkeleton, PostsSkeleton } from "@/components/Skeletons";
import ProfileTabs from "@/components/ProfileTabs";
import { UserWithExtras, PostWithExtras } from "@/lib/definitions";
import { Lock } from "lucide-react";
import PostsGrid from "@/components/PostsGrid";
import ProfileAvatar from "@/components/ProfileAvatar";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function TaggedPage({
  params,
}: {
  params: { username: string };
}) {
  const { username } = params;
  
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await fetchProfile(username);

  if (!profile) notFound();

  const isCurrentUser = session.user.username === profile.username;

  // Can view profile if:
  // 1. It's the current user's profile
  // 2. The profile is not private
  // 3. The current user is following this profile
  const isFollowing = !isCurrentUser && profile.followers.some(
    follow => follow.followerId === session.user?.id && follow.status === "ACCEPTED"
  );
  const canViewProfile = isCurrentUser || !profile.isPrivate || isFollowing;

  // Only redirect if trying to view a private profile without access
  if (!canViewProfile && profile.isPrivate) {
    redirect(`/dashboard/${username}`);
  }

  // Get valid stories for the profile header
  const validStories = profile.stories?.map(story => ({
    id: story.id,
    fileUrl: story.fileUrl,
    scale: story.scale,
    user_id: story.user_id,
    createdAt: story.createdAt instanceof Date 
      ? story.createdAt.toISOString() 
      : new Date(story.createdAt).toISOString()
  })) || [];

  return (
    <main className="flex-1">
      <div className="max-w-[935px] mx-auto pt-8">
        <section className="flex flex-col md:flex-row gap-y-4 px-4 pb-6 md:pt-4">
          <div className="shrink-0 md:w-[290px] md:mr-7 flex justify-center md:justify-center">
            <ProfileAvatar user={profile as UserWithExtras} stories={validStories} showModal={true}>
              <UserAvatar
                user={profile}
                className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] cursor-pointer"
                priority={true}
              />
            </ProfileAvatar>
          </div>

          <div className="flex flex-col flex-1 max-w-full gap-y-3 md:pt-3">
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-2 md:flex-row md:items-center md:gap-x-4">
                <div className="flex items-center gap-x-2">
                  <h2 className="inline-flex items-center gap-x-1.5 text-xl">
                    <span className="font-normal">{profile.username}</span>
                    {profile.verified && <VerifiedBadge />}
                  </h2>
                </div>

                {isCurrentUser && (
                  <Link
                    href="/dashboard/edit"
                    className={buttonVariants({
                      variant: "secondary",
                      className: "w-full md:w-auto text-sm"
                    })}
                  >
                    Edit profile
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
                      {profile.followers.filter(f => f.status === "ACCEPTED").length}
                    </strong>{" "}
                    followers
                  </span>
                </Link>
                <Link href={`/dashboard/${profile.username}/following`}>
                  <span>
                    <strong className="font-semibold">
                      {profile.following.filter(f => f.status === "ACCEPTED").length}
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
          </div>
        </section>

        <Suspense fallback={<ProfileTabsSkeleton />}>
          <ProfileTabs profile={profile as UserWithExtras} isCurrentUser={isCurrentUser} defaultTab="tagged" />
        </Suspense>
        
        <Suspense fallback={
          <div className="px-4">
            <PostsSkeleton />
          </div>
        }>
          <div className="mt-4 px-4">
            {!profile.taggedPosts?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Lock className="w-12 h-12 text-neutral-500 mb-4" />
                <h1 className="text-2xl font-semibold mb-2">No Tagged Posts</h1>
                <p className="text-neutral-500 max-w-sm">
                  When people tag you in posts, they&apos;ll appear here.
                </p>
              </div>
            ) : (
              <PostsGrid posts={profile.taggedPosts} />
            )}
          </div>
        </Suspense>
      </div>
    </main>
  );
} 