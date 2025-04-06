import { auth } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import ProfileTabs from "@/components/ProfileTabs";
import UserAvatar from "@/components/UserAvatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchProfile, fetchUserStories, getReelsEnabled, isUserBlocked } from "@/lib/data";
import { Lock, MoreHorizontal, UserX } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileTabsSkeleton } from "@/components/Skeletons";
import PostsGrid from "@/components/PostsGrid";
import VerifiedBadge from "@/components/VerifiedBadge";
import { unstable_noStore as noStore } from "next/cache";
import { 
  StoryWithExtras, 
  UserWithExtras, 
  UserWithFollows, 
  UserRole, 
  UserStatus,
  PostWithExtras,
  CommentWithExtras,
  SavedPostWithExtras,
  FollowerWithExtras,
  FollowingWithExtras,
  Like,
  SavedPost,
  PostTag,
  Post,
  User,
  Story
} from "@/lib/definitions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileMenu from "@/components/ProfileMenu";
import ProfileStats from "@/components/ProfileStats";
import MobileBottomNav from "@/components/MobileBottomNav";
import BlockButton from "@/components/BlockButton";
import { PrismaClient, Prisma } from "@prisma/client";

interface Props {
  params: {
    username: string;
  };
}

// Add this interface to match ProfileAvatar's Story type
interface ProfileAvatarStory {
  id: string;
  fileUrl: string;
  createdAt: Date;
  scale?: number;
  user_id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    username: string | null;
    password: string | null;
    image: string | null;
    bio: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    stories?: { id: string }[];
    hasActiveStory?: boolean;
  };
}

// Update the transformation helper
function transformStoryToStoryType(story: StoryWithExtras): {
  id: string;
  fileUrl: string;
  createdAt: Date;
  scale?: number;
  user_id: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isPrivate: boolean;
    role: UserRole;
    status: UserStatus;
  };
  views?: any[];
  likes?: any[];
} {
  return {
    id: story.id,
    fileUrl: story.fileUrl,
    createdAt: story.createdAt,
    scale: story.scale,
    user_id: story.user_id,
    user: {
      id: story.user.id,
      username: story.user.username,
      name: story.user.name,
      image: story.user.image,
      verified: story.user.verified,
      isPrivate: story.user.isPrivate || false,
      role: story.user.role as UserRole,
      status: story.user.status as UserStatus
    },
    views: story.views || [],
    likes: story.likes || []
  };
}

// Update the ProfilePage component props type
interface ProfilePageProps {
  profile: UserWithExtras;
  isCurrentUser: boolean;
  reelsEnabled?: boolean; // Make reelsEnabled optional
}

export default async function ProfilePage({ params }: Props) {
  noStore();
  try {
    const session = await auth();
    if (!session?.user) {
      redirect("/login");
    }

    // Await the params before using them
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username);
    const profile = await fetchProfile(decodedUsername);
    
    if (!profile) {
      notFound();
    }

    const isCurrentUser = session.user.id === profile.id;

    // Get user's stories
    const stories = await fetchUserStories(profile.id);
    const hasValidStories = stories.length > 0;

    // Transform stories
    const transformedStories = stories.map(story => transformStoryToStoryType(story));

    // Get reels enabled status
    const reelsEnabled = await getReelsEnabled();

    // Transform the profile data to include required fields
    const profileWithExtras = {
      ...profile,
      role: profile.role as UserRole,
      status: profile.status as UserStatus,
      following: profile.following?.map(f => ({
        ...f,
        status: f.status as "ACCEPTED" | "PENDING",
        following: {
          ...f.following,
          email: "",
          password: "",
          bio: "",
          role: "USER" as UserRole,
          status: "NORMAL" as UserStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
          followers: [],
          following: [],
          followedBy: []
        }
      })) as FollowingWithExtras[] || [],
      followers: profile.followers?.map(f => ({
        ...f,
        status: f.status as "ACCEPTED" | "PENDING",
        follower: {
          ...f.follower,
          email: "",
          password: "",
          bio: "",
          role: "USER" as UserRole,
          status: "NORMAL" as UserStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
          followers: [],
          following: [],
          followedBy: []
        }
      })) as FollowerWithExtras[] || [],
      posts: profile.posts?.map(post => ({
        ...post,
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          username: profile.username,
          password: profile.password,
          image: profile.image,
          bio: profile.bio,
          verified: profile.verified,
          isPrivate: profile.isPrivate || false,
          role: profile.role as UserRole,
          status: profile.status as UserStatus,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          following: [],
          followers: []
        } as User,
        likes: (post.likes || []).map(like => ({
          ...like,
          user: {
            id: like.user_id,
            name: null,
            email: "",
            username: null,
            password: null,
            image: null,
            bio: null,
            verified: false,
            isPrivate: false,
            role: "USER" as UserRole,
            status: "NORMAL" as UserStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
            following: [],
            followers: []
          } as User
        })) as (Like & { user: User })[]
      })) as PostWithExtras[] || [],
      stories: transformedStories
    } as UserWithExtras;

    // Check follow status after profile transformation
    const isFollowing = profileWithExtras.followers?.some(
      (follow) => follow.followerId === session.user.id && follow.status === "ACCEPTED"
    ) || false;

    const hasPendingRequest = profileWithExtras.followers?.some(
      (follow) => follow.followerId === session.user.id && follow.status === "PENDING"
    ) || false;

    const isFollowedByUser = profileWithExtras.following?.some(
      (follow) => follow.followingId === session.user.id && follow.status === "ACCEPTED"
    ) || false;

    // Check if the current user has blocked this user
    const isBlocked = session?.user?.id
      ? await isUserBlocked(session.user.id, profile.id)
      : false;

    // Check if the current user is blocked by this user
    const isBlockedBy = session?.user?.id
      ? await isUserBlocked(profile.id, session.user.id)
      : false;

    // If either user has blocked the other, show a message
    if (isBlocked || isBlockedBy) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold mb-4">
            {isBlocked ? "You have blocked this user" : "This user has blocked you"}
          </h1>
          {isBlocked && (
            <BlockButton
              userId={profileWithExtras.id}
              isBlocked={true}
              className="mt-4"
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 pb-[56px] md:pb-0 bg-white dark:bg-black mt-[72px]" suppressHydrationWarning>
          <div className="max-w-[935px] mx-auto" suppressHydrationWarning>
            <section className="flex flex-col md:flex-row gap-y-4 px-4 pb-6" suppressHydrationWarning>
              <div className="shrink-0 md:w-[290px] md:mr-7 flex justify-center md:justify-center" suppressHydrationWarning>
                <ProfileAvatar user={profileWithExtras} stories={transformedStories} showModal={true}>
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
                          username={profileWithExtras.username}
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
                          username={profileWithExtras.username}
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
            ) : (
              <>
                <Suspense fallback={<ProfileTabsSkeleton />}>
                  <ProfileTabs 
                    profile={profileWithExtras} 
                    isCurrentUser={isCurrentUser}
                    reelsEnabled={reelsEnabled}
                  />
                </Suspense>
              </>
            )}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  } catch (error) {
    console.error('[ProfilePage] Error:', error);
    notFound();
  }
} 