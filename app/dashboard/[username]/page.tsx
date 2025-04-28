import { auth } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import ProfileTabs from "@/components/ProfileTabs";
import UserAvatar from "@/components/UserAvatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchProfile, fetchUserStories, getReelsEnabled } from "@/lib/data";
import { Lock, MoreHorizontal, UserX, ChevronLeft } from "lucide-react";
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
  Story,
  StoryView
} from "@/lib/definitions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileMenu from "@/components/ProfileMenu";
import ProfileStats from "@/components/ProfileStats";
import MobileBottomNav from "@/components/MobileBottomNav";
import BlockedUserSection from "@/components/BlockedUserSection";
import BackButton from "@/components/BackButton";
import ProfileRevalidation from "@/components/ProfileRevalidation";
import { AutoRefreshPrivateProfile } from "@/components/AutoRefreshPrivateProfile";

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

export default async function ProfilePage({ params }: { params: { username: string } }) {
  // Add noStore() to prevent caching
  noStore();
  
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Await the params.username
  const { username } = await params;

  if (!username) {
    notFound();
  }

  // Fetch fresh profile data
  const profile = await fetchProfile(username);
  if (!profile) {
    notFound();
  }

  // Check follow status directly from the database
  const followStatus = db ? await db.follows.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: profile.id
      }
    }
  }) : null;

  const isFollowing = followStatus?.status === "ACCEPTED";
  const hasPendingRequest = followStatus?.status === "PENDING";
  
  // Check if the profile owner follows the current user
  const reverseFollowStatus = db ? await db.follows.findUnique({
    where: {
      followerId_followingId: {
        followerId: profile.id,
        followingId: session.user.id
      }
    }
  }) : null;

  const isFollowedByUser = reverseFollowStatus?.status === "ACCEPTED";
  const isCurrentUser = session.user.id === profile.id;

  const profileWithExtras: UserWithExtras = {
    ...profile,
    role: profile.role as UserRole,
    status: profile.status as UserStatus,
    followers: profile.followers?.map((f: { follower: User; followerId: string; followingId: string }) => ({
      ...f.follower,
      isFollowing: false,
      isPrivate: false,
      hasPendingRequest: false,
      isFollowedByUser: false,
      hasActiveStory: false,
      followerId: f.followerId,
      followingId: f.followingId,
      uniqueId: `${f.followerId}-${f.followingId}`,
      follower: f.follower,
      role: f.follower.role,
      status: f.follower.status
    })) || [],
    following: profile.following?.map((f: { following: User; followerId: string; followingId: string }) => ({
      ...f.following,
      isFollowing: false,
      isPrivate: false,
      hasPendingRequest: false,
      isFollowedByUser: false,
      hasActiveStory: false,
      followerId: f.followerId,
      followingId: f.followingId,
      uniqueId: `${f.followerId}-${f.followingId}`,
      following: f.following,
      role: f.following.role,
      status: f.following.status
    })) || [],
    posts: profile.posts?.map((post: PostWithExtras) => ({
      ...post,
      user: {
        ...post.user,
        isFollowing: false,
        isPrivate: false,
        hasPendingRequest: false,
        isFollowedByUser: false,
        hasActiveStory: false
      },
      tags: post.tags || []
    })) || [],
    savedPosts: profile.savedPosts?.map((savedPost: SavedPostWithExtras) => ({
      ...savedPost,
      post: savedPost.post ? {
        ...savedPost.post,
        user: {
          ...savedPost.post.user,
          isFollowing: false,
          isPrivate: false,
          hasPendingRequest: false,
          isFollowedByUser: false,
          hasActiveStory: false
        },
        tags: savedPost.post.tags || []
      } : null,
      user: profile
    })) || [],
    postTags: profile.postTags?.map((tag: { post: PostWithExtras }) => ({
      ...tag,
      post: {
        ...tag.post,
        user: {
          ...tag.post.user,
          isFollowing: false,
          isPrivate: false,
          hasPendingRequest: false,
          isFollowedByUser: false,
          hasActiveStory: false
        },
        tags: tag.post.tags || []
      }
    })) || [],
    stories: [],
    followersCount: profile.followers?.length || 0,
    followingCount: profile.following?.length || 0,
    hasActiveStory: false,
    isFollowing,
    hasPendingRequest,
    isFollowedByUser,
    hasPendingRequestFromUser: false
  };

  // Filter posts based on privacy and follow status
  const visiblePosts = profileWithExtras.posts.filter((post: PostWithExtras) => {
    // If it's the current user's profile, show all posts
    if (isCurrentUser) return true;
    
    // If the profile is private and not following, hide all posts
    if (profileWithExtras.isPrivate && !isFollowing) return false;
    
    // If the profile is not private or following, show all posts
    return true;
  });

  // Update the profile object with filtered posts
  profileWithExtras.posts = visiblePosts;

  // Check if user is blocked - with error handling
  let isBlocked = false;
  try {
    if (!db) {
      throw new Error("Database connection not available");
    }
    const blockRecord = await db.block.findFirst({
      where: {
        blockerId: session.user.id,
        blockedId: profileWithExtras.id,
      },
    });
    isBlocked = !!blockRecord;
  } catch (error) {
    console.error("Error checking block status:", error);
    isBlocked = false;
  }

  // Check if user is blocked by the profile owner
  let isBlockedByUser = false;
  try {
    if (!db) {
      throw new Error("Database connection not available");
    }
    const blockRecord = await db.block.findFirst({
      where: {
        blockerId: profileWithExtras.id,
        blockedId: session.user.id,
      },
    });
    isBlockedByUser = !!blockRecord;
  } catch (error) {
    console.error("Error checking if blocked by user:", error);
    isBlockedByUser = false;
  }

  // If user is blocked by the profile owner, show blocked message
  if (isBlockedByUser) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 pb-[56px] md:pb-0 bg-white dark:bg-black mt-[72px]">
          <div className="max-w-[935px] mx-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <BackButton />
            </div>
            <div className="flex flex-col items-center justify-center py-20 text-center border-t border-neutral-200 dark:border-neutral-800">
              <UserX className="w-12 h-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-semibold mb-2">You've been blocked</h1>
              <p className="text-neutral-500 max-w-sm px-4">
                This user has blocked you. You cannot see their posts or interact with their profile.
              </p>
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Get user's stories
  let stories: StoryWithExtras[] = [];
  try {
    if (!db) {
      throw new Error("Database connection not available");
    }
    const rawStories = await db.story.findMany({
      where: {
        user_id: profileWithExtras.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        user: true,
        views: {
          include: {
            user: true,
          },
        },
        likes: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    stories = rawStories.map((story) => {
      const baseUser: User = {
        id: story.user.id,
        name: story.user.name || null,
        email: story.user.email || "",
        username: story.user.username || "",
        password: story.user.password || "",
        image: story.user.image || null,
        bio: story.user.bio || null,
        verified: story.user.verified || false,
        isPrivate: story.user.isPrivate || false,
        role: UserRole.USER,
        status: "NORMAL" as UserStatus,
        createdAt: story.user.createdAt || new Date(),
        updatedAt: story.user.updatedAt || new Date(),
      };

      return {
        id: story.id,
        createdAt: story.createdAt,
        fileUrl: story.fileUrl,
        scale: story.scale || 1,
        user_id: story.user_id,
        user: baseUser,
        views: (story.views || []).map((view) => ({
          id: view.id,
          createdAt: view.createdAt,
          storyId: view.storyId,
          user_id: view.user_id,
          updatedAt: view.createdAt,
          user: {
            ...baseUser,
            id: view.user.id,
            name: view.user.name || null,
            username: view.user.username || "",
            image: view.user.image || null,
          },
        })),
        likes: (story.likes || []).map((like) => ({
          id: like.id,
          createdAt: like.createdAt,
          updatedAt: like.updatedAt || new Date(),
          user_id: like.user_id,
          postId: null,
          reelId: null,
          storyId: story.id,
          user: {
            ...baseUser,
            id: like.user.id,
            name: like.user.name || null,
            username: like.user.username || "",
            image: like.user.image || null,
          },
        })),
      } as StoryWithExtras;
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    stories = [];
  }

  // Get reels enabled status
  const reelsEnabled = await getReelsEnabled();

  return (
    <ProfileRevalidation username={username}>
      <div className="flex flex-col min-h-screen">
        {/* Add the auto-refresh component for private profiles */}
        {profileWithExtras.isPrivate && <AutoRefreshPrivateProfile 
          username={username} 
          userId={profileWithExtras.id} 
        />}
        <main className="flex-1 pb-[56px] md:pb-0 bg-white dark:bg-black mt-[72px]" suppressHydrationWarning>
          <div className="max-w-[935px] mx-auto" suppressHydrationWarning>
            <section className="flex flex-col md:flex-row gap-y-4 px-4 pb-6" suppressHydrationWarning>
              <div className="shrink-0 md:w-[290px] md:mr-7 flex justify-center md:justify-center" suppressHydrationWarning>
                <ProfileAvatar user={profileWithExtras} stories={stories} showModal={true} isBlocked={isBlocked}>
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

                  {/* Only show stats if not blocked */}
                  {!isBlocked && (
                    <div className="flex items-center justify-around md:justify-start md:gap-x-7 text-sm border-y border-neutral-200 dark:border-neutral-800 py-3 md:border-0 md:py-0" suppressHydrationWarning>
                      <ProfileStats 
                        profile={profileWithExtras}
                        isCurrentUser={isCurrentUser}
                        isFollowing={isFollowing}
                      />
                    </div>
                  )}

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

            <div className="px-4 md:px-8">
              {isBlocked ? (
                <BlockedUserSection userId={profileWithExtras.id} />
              ) : !isCurrentUser && profileWithExtras.isPrivate && !isFollowing ? (
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
                      defaultTab="posts"
                    />
                  </Suspense>
                </>
              )}
            </div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </ProfileRevalidation>
  );
} 