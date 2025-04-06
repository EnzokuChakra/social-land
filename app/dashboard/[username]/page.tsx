'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import ProfileTabs from "@/components/ProfileTabs";
import UserAvatar from "@/components/UserAvatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchProfile, fetchUserStories, getReelsEnabled } from "@/lib/data";
import { Lock, MoreHorizontal, UserX } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ProfileTabsSkeleton } from "@/components/Skeletons";
import PostsGrid from "@/components/PostsGrid";
import VerifiedBadge from "@/components/VerifiedBadge";
import { db } from "@/lib/db";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileMenu from "@/components/ProfileMenu";
import ProfileStats from "@/components/ProfileStats";
import MobileBottomNav from "@/components/MobileBottomNav";
import { storyview as PrismaStoryView } from "@prisma/client";

interface Props {
  params: {
    username: string;
  };
}

export default function ProfilePage({ params }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!session?.user) {
          router.push("/login");
          return;
        }

        const username = params?.username;
        if (!username) {
          router.push("/404");
          return;
        }

        const profileData = await fetchProfile(username);
        if (!profileData) {
          router.push("/404");
          return;
        }

        setProfile(profileData);

        // Check if user is blocked
        try {
          if (db.block) {
            const blockRecord = await db.block.findFirst({
              where: {
                blockerId: session.user.id,
                blockedId: profileData.id,
              },
            });
            setIsBlocked(!!blockRecord);
          }
        } catch (error) {
          console.error("Error checking block status:", error);
          setIsBlocked(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, params.username, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!profile) {
    return null;
  }

  const profileWithExtras = {
    ...profile,
    followers: profile.followers || [],
    following: profile.following || [],
  };

  const isCurrentUser = session?.user?.id === profileWithExtras.id;
  const isFollowing = profileWithExtras.followers.some(
    (follow: any) => follow.followerId === session?.user?.id && follow.status === "ACCEPTED"
  );
  const hasPendingRequest = profileWithExtras.followers.some(
    (follow: any) => follow.followerId === session?.user?.id && follow.status === "PENDING"
  );
  const isFollowedByUser = profileWithExtras.followers.some(
    (follow: any) => follow.followingId === session?.user?.id && follow.status === "ACCEPTED"
  );

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-[56px] md:pb-0 bg-white dark:bg-black mt-[72px]" suppressHydrationWarning>
        <div className="max-w-[935px] mx-auto" suppressHydrationWarning>
          <section className="flex flex-col md:flex-row gap-y-4 px-4 pb-6" suppressHydrationWarning>
            <div className="shrink-0 md:w-[290px] md:mr-7 flex justify-center md:justify-center" suppressHydrationWarning>
              <ProfileAvatar user={profileWithExtras} stories={[]} showModal={true}>
                <UserAvatar
                  user={profileWithExtras}
                  className="w-[86px] h-[86px] md:w-[150px] md:h-[150px] cursor-pointer ring-2 ring-neutral-100 dark:ring-neutral-900"
                  priority={true}
                />
              </ProfileAvatar>
            </div>

            <div className="flex flex-col flex-1 max-w-full gap-y-4 md:gap-y-3" suppressHydrationWarning>
              <div className="flex flex-col gap-y-4 md:gap-y-3" suppressHydrationWarning>
                <div className="flex flex-col gap-y-3 md:flex-row md:items-center md:gap-x-4" suppressHydrationWarning>
                  <div className="flex items-center gap-x-2" suppressHydrationWarning>
                    <h2 className="inline-flex items-center gap-x-1.5 text-xl md:text-xl" suppressHydrationWarning>
                      <span className="font-normal">{profileWithExtras.username}</span>
                      {profileWithExtras.verified && <VerifiedBadge />}
                    </h2>
                    {profileWithExtras.isPrivate && !isCurrentUser && (
                      <Lock className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>
                  {isCurrentUser ? (
                    <div className="flex items-center gap-x-2" suppressHydrationWarning>
                      <Link
                        href="/dashboard/edit-profile"
                        className={buttonVariants({
                          className: "!font-semibold text-sm h-9 px-6 w-full md:w-auto",
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        Edit profile
                      </Link>
                    </div>
                  ) : profileWithExtras.status === "BANNED" ? (
                    <div className="flex items-center gap-x-2 w-full md:w-auto" suppressHydrationWarning>
                      <ProfileMenu 
                        userId={profileWithExtras.id} 
                        username={profileWithExtras.username || ""}
                        userStatus={profileWithExtras.status}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-x-2 w-full md:w-auto" suppressHydrationWarning>
                      <FollowButton
                        followingId={profileWithExtras.id}
                        isFollowing={isFollowing}
                        hasPendingRequest={hasPendingRequest}
                        isPrivate={profileWithExtras.isPrivate}
                        isFollowedByUser={isFollowedByUser}
                        className="!font-semibold h-9 w-full md:w-auto"
                        variant="profile"
                      />
                      <ProfileMenu 
                        userId={profileWithExtras.id} 
                        username={profileWithExtras.username || ""}
                        userStatus={profileWithExtras.status}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-around md:justify-start md:gap-x-7 text-sm border-y border-neutral-200 dark:border-neutral-800 py-3 md:border-0 md:py-0" suppressHydrationWarning>
                  <ProfileStats 
                    profile={profileWithExtras}
                    isCurrentUser={isCurrentUser}
                    isFollowing={isFollowing}
                  />
                </div>

                <div className="flex flex-col gap-y-1" suppressHydrationWarning>
                  {profileWithExtras.name && (
                    <span className="font-semibold text-sm" suppressHydrationWarning>{profileWithExtras.name}</span>
                  )}
                  {profileWithExtras.bio && (
                    <span className="text-sm whitespace-pre-line text-neutral-600 dark:text-neutral-400" suppressHydrationWarning>
                      {profileWithExtras.bio}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {!isCurrentUser && profileWithExtras.isPrivate && !isFollowing ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-t border-neutral-200 dark:border-neutral-800" suppressHydrationWarning>
              <Lock className="w-12 h-12 text-neutral-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">This Account is Private</h1>
              <p className="text-neutral-500 max-w-sm px-4">
                Follow this account to see their photos and videos.
              </p>
              {hasPendingRequest && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                  Follow request pending
                </p>
              )}
            </div>
          ) : profileWithExtras.status === "BANNED" ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-t border-neutral-200 dark:border-neutral-800" suppressHydrationWarning>
              <UserX className="w-12 h-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">This Account is Banned</h1>
              <p className="text-neutral-500 max-w-sm px-4">
                This user has been banned for violating our community guidelines.
              </p>
            </div>
          ) : isBlocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-t border-neutral-200 dark:border-neutral-800" suppressHydrationWarning>
              <UserX className="w-12 h-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">This User is Blocked</h1>
              <p className="text-neutral-500 max-w-sm px-4">
                You have blocked this user. They cannot see your posts or interact with your profile.
              </p>
              <form action="/api/users/block" method="POST">
                <input type="hidden" name="userId" value={profileWithExtras.id} />
                <Button
                  variant="secondary"
                  className="mt-4"
                  type="submit"
                >
                  Unblock User
                </Button>
              </form>
            </div>
          ) : (
            <>
              <Suspense fallback={<ProfileTabsSkeleton />}>
                <ProfileTabs 
                  profile={profileWithExtras} 
                  isCurrentUser={isCurrentUser}
                  defaultTab="posts"
                />
              </Suspense>
            </>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
} 