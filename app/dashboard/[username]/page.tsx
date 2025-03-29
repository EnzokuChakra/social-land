import { auth } from "@/lib/auth";
import FollowButton from "@/components/FollowButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import ProfileTabs from "@/components/ProfileTabs";
import UserAvatar from "@/components/UserAvatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { fetchProfile, fetchUserStories, getReelsEnabled } from "@/lib/data";
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
  User
} from "@/lib/definitions";
import { Story } from "@prisma/client";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ProfileHeader from "@/components/ProfileHeader";
import MobileNavbar from "@/components/MobileNavbar";
import ProfileMenu from "@/components/ProfileMenu";

interface Props {
  params: {
    username: string;
  };
}

// Add this interface to match ProfileAvatar's Story type
interface ProfileAvatarStory {
  id: string;
  fileUrl: string;
  createdAt: string;
  scale: number;
  user_id: string;
}

// Update the transformation helper
function transformStoryToStoryType(story: StoryWithExtras): Story {
  return {
    id: story.id,
    fileUrl: story.fileUrl,
    scale: story.scale,
    user_id: story.user_id,
    createdAt: new Date(story.createdAt)
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
    
    if (hasValidStories) {
      console.log("[PROFILE_PAGE] Found valid stories:", {
        count: stories.length,
        username: profile.username,
      });
    }

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
        })) as (Like & { user: User })[],
        savedBy: (post.savedBy || []).map(save => ({
          ...save,
          user: {
            id: save.user_id,
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
        })) as (SavedPost & { user: User })[],
        comments: (post.comments || []).map(comment => ({
          ...comment,
          user: {
            id: comment.user_id,
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
          } as User,
          likes: [],
          replies: [],
          parent: null,
          parentId: null
        })) as CommentWithExtras[],
        tags: post.tags || []
      })) as PostWithExtras[] || [],
      saved: [],
      stories: stories.map((story: Story) => ({
        ...story,
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
        likes: [],
        views: []
      })) as StoryWithExtras[]
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

    // Update the story transformation
    const validStories = stories.map(story => ({
      id: story.id,
      fileUrl: story.fileUrl,
      scale: story.scale,
      user_id: story.user_id,
      createdAt: story.createdAt instanceof Date 
        ? story.createdAt.toISOString() 
        : new Date(story.createdAt).toISOString()
    })) as ProfileAvatarStory[];

    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 pb-[72px] md:pb-0 bg-white dark:bg-black" suppressHydrationWarning>
          <div className="max-w-[935px] mx-auto pt-4" suppressHydrationWarning>
            <section className="flex flex-col md:flex-row gap-y-4 px-4 pb-6 md:pt-8" suppressHydrationWarning>
              <div className="shrink-0 md:w-[290px] md:mr-7 flex justify-center md:justify-center" suppressHydrationWarning>
                <ProfileAvatar user={profileWithExtras} stories={validStories} showModal={true}>
                  <UserAvatar
                    user={profileWithExtras}
                    className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] cursor-pointer"
                    priority={true}
                  />
                </ProfileAvatar>
              </div>

              <div className="flex flex-col flex-1 max-w-full gap-y-3 md:pt-3" suppressHydrationWarning>
                <div className="flex flex-col gap-y-3" suppressHydrationWarning>
                  <div className="flex flex-col items-center md:items-start md:flex-row md:gap-x-2" suppressHydrationWarning>
                    <h2 className="inline-flex items-center gap-x-1.5 text-lg md:text-xl" suppressHydrationWarning>
                      <span className="font-normal">{profileWithExtras.username}</span>
                      {profileWithExtras.verified && <VerifiedBadge />}
                    </h2>
                    {profileWithExtras.isPrivate && !isCurrentUser && (
                      <Lock className="w-4 h-4 text-neutral-500" />
                    )}
                  </div>

                  <div className="flex flex-col items-center md:items-start gap-y-3" suppressHydrationWarning>
                    <div className="flex items-center justify-center gap-x-6 text-sm w-full md:w-auto" suppressHydrationWarning>
                      {(!profileWithExtras.isPrivate || isCurrentUser || isFollowing) ? (
                        <Link href={`/dashboard/${profileWithExtras.username}/followers`}>
                          <span className="hover:opacity-75 transition" suppressHydrationWarning>
                            <strong className="font-semibold">
                              {profileWithExtras.followers.filter(f => f.status === "ACCEPTED").length}
                            </strong>{" "}
                            {profileWithExtras.followers.filter(f => f.status === "ACCEPTED").length === 1 ? "follower" : "followers"}
                          </span>
                        </Link>
                      ) : (
                        <span className="cursor-default" suppressHydrationWarning>
                          <strong className="font-semibold">
                            {profileWithExtras.followers.filter(f => f.status === "ACCEPTED").length}
                          </strong>{" "}
                          {profileWithExtras.followers.filter(f => f.status === "ACCEPTED").length === 1 ? "follower" : "followers"}
                        </span>
                      )}
                      {(!profileWithExtras.isPrivate || isCurrentUser || isFollowing) ? (
                        <Link href={`/dashboard/${profileWithExtras.username}/following`}>
                          <span className="hover:opacity-75 transition" suppressHydrationWarning>
                            <strong className="font-semibold">
                              {profileWithExtras.following.filter(f => f.status === "ACCEPTED").length}
                            </strong>{" "}
                            following
                          </span>
                        </Link>
                      ) : (
                        <span className="cursor-default" suppressHydrationWarning>
                          <strong className="font-semibold">
                            {profileWithExtras.following.filter(f => f.status === "ACCEPTED").length}
                          </strong>{" "}
                          following
                        </span>
                      )}
                    </div>

                    {isCurrentUser ? (
                      <div className="flex items-center justify-center w-full md:w-auto" suppressHydrationWarning>
                        <Link
                          href="/dashboard/edit-profile"
                          className={buttonVariants({
                            className: "!font-semibold text-sm h-8 px-4 w-[200px] md:w-auto",
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          Edit profile
                        </Link>
                      </div>
                    ) : profileWithExtras.status === "BANNED" ? (
                      <div className="flex items-center justify-center w-full md:w-auto" suppressHydrationWarning>
                        <ProfileMenu 
                          userId={profileWithExtras.id} 
                          username={profileWithExtras.username}
                          userStatus={profileWithExtras.status}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full md:w-auto" suppressHydrationWarning>
                        <FollowButton
                          followingId={profileWithExtras.id}
                          isFollowing={isFollowing}
                          hasPendingRequest={hasPendingRequest}
                          isPrivate={profileWithExtras.isPrivate}
                          isCurrentUser={isCurrentUser}
                        />
                      </div>
                    )}
                  </div>

                  {profileWithExtras.name && (
                    <span className="font-semibold text-sm text-center md:text-left" suppressHydrationWarning>{profileWithExtras.name}</span>
                  )}
                  {profileWithExtras.bio && (
                    <span className="text-sm whitespace-pre-line text-center md:text-left" suppressHydrationWarning>{profileWithExtras.bio}</span>
                  )}
                </div>
              </div>
            </section>

            {!isCurrentUser && profileWithExtras.isPrivate && !isFollowing ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">This account is private</p>
                <p className="text-sm text-neutral-500">Follow this user to see their content</p>
              </div>
            ) : (
              <Suspense fallback={<ProfileTabsSkeleton />}>
                <ProfileTabs
                  posts={profileWithExtras.posts || []}
                  reels={profileWithExtras.stories || []}
                  reelsEnabled={reelsEnabled}
                  isCurrentUser={isCurrentUser}
                  username={profileWithExtras.username}
                />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('[ProfilePage] Error:', error);
    notFound();
  }
} 