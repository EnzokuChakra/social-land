/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { auth } from "@/lib/auth";
import UserAvatar from "@/components/UserAvatar";
import { PostWithExtras, PostTag } from "@/lib/definitions";
import Image from "next/image";
import Link from "next/link";
import Comments from "./Comments";
import Timestamp from "./Timestamp";
import { Card } from "./ui/card";
import PostOptions from "./PostOptions";
import PostActions from "./PostActions";
import VerifiedBadge from "./VerifiedBadge";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import ProfileHoverCard from "./ProfileHoverCard";
import { useRouter } from "next/navigation";
import TaggedUsersModal from "./TaggedUsersModal";
import { useStoryModal } from "@/hooks/use-story-modal";
import { cn } from "@/lib/utils";

function Post({ post }: { post: PostWithExtras }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username = post.user.username;
  const commentInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [showTaggedModal, setShowTaggedModal] = useState(false);
  const [allLikes, setallLikes] = useState(post.likes.length);
  const storyModal = useStoryModal();

  if (!session?.user) return null;

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (post.user.hasActiveStory) {
      try {
        const response = await fetch(`/api/user-stories/${post.user.id}`);
        const { success, data: stories } = await response.json();
        
        if (success && stories && stories.length > 0) {
          storyModal.setUserStories([{ userId: post.user.id, stories }]);
          storyModal.setUserId(post.user.id);
          storyModal.setCurrentUserIndex(0);
          storyModal.onOpen();
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    } else {
      router.push(`/dashboard/${username}`);
    }
  };

  // Get caption length to determine display style
  const isCaptionShort = post.caption ? post.caption.length < 30 : true;

  // Format tagged users text
  const getTaggedText = () => {
    if (!Array.isArray(post.tags) || post.tags.length === 0) {
      return null;
    }

    // Ensure each tag has the required user data
    const validTags = post.tags.filter(tag => tag && tag.user && tag.user.username);
    
    if (validTags.length === 0) {
      return null;
    }

    if (validTags.length === 1) {
      const tag = validTags[0];
      return (
        <span>
          with{" "}
          <Link href={`/dashboard/${tag.user.username}`} className="font-semibold hover:underline">
            {tag.user.username}
          </Link>
        </span>
      );
    }

    return (
      <span>
        with{" "}
        <button onClick={() => setShowTaggedModal(true)} className="font-semibold hover:underline">
          {validTags.length} others
        </button>
      </span>
    );
  };

  // Add proper type for tags
  const handleTagClick = (tag: PostTag) => {
    router.push(`/dashboard/${tag.user.username}`);
  };

  return (
    <div className="flex flex-col space-y-2 mb-7 border-b border-gray-200 dark:border-neutral-800 pb-4">
      <div className="flex items-center justify-between px-3 sm:px-0">
        <div className="flex items-center gap-2">
          <div
            onClick={handleAvatarClick}
            className={cn(
              "relative cursor-pointer",
              post.user.hasActiveStory && "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-yellow-400 before:to-fuchsia-600 before:p-[2px] before:w-[calc(100%+4px)] before:h-[calc(100%+4px)] before:-left-[2px] before:-top-[2px]"
            )}
          >
            <div className={cn(
              "relative rounded-full overflow-hidden w-[32px] h-[32px]",
              post.user.hasActiveStory && "p-[2px] bg-white dark:bg-black"
            )}>
              <UserAvatar 
                user={post.user}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="text-sm flex-grow min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1">
                <ProfileHoverCard user={post.user}>
                  <Link href={`/dashboard/${username}`} className="font-semibold hover:underline truncate">
                    {username}
                  </Link>
                </ProfileHoverCard>
                {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[15px] text-neutral-500 dark:text-neutral-400">with</span>
                  {post.tags.length === 1 ? (
                    <ProfileHoverCard user={post.tags[0].user}>
                      <Link
                        href={`/dashboard/${post.tags[0].user.username}`}
                        className="font-semibold hover:underline text-[15px] inline-flex items-center gap-1"
                      >
                        {post.tags[0].user.username}
                        {post.tags[0].user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                      </Link>
                    </ProfileHoverCard>
                  ) : (
                    <button
                      onClick={() => setShowTaggedModal(true)}
                      className="font-semibold hover:underline text-[15px]"
                    >
                      {post.tags.length} others
                    </button>
                  )}
                </div>
              )}
            </div>
            {post.location && (
              <Link
                href={`/dashboard/location/${encodeURIComponent(post.location)}`}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline block mt-0.5"
              >
                {post.location}
              </Link>
            )}
          </div>
        </div>
        <PostOptions post={post} userId={userId} />
      </div>

      <Link href={`/dashboard/p/${post.id}`} className="relative block">
        <Card className="relative w-full overflow-hidden rounded-none sm:rounded-md">
          <Image
            src={post.fileUrl}
            alt="Post Image"
            width={1000}
            height={1000}
            quality={100}
            priority
            className="h-auto w-full object-contain"
          />
        </Card>
      </Link>

      <PostActions
        post={post}
        userId={userId}
        className="px-3 sm:px-0 mt-2"
        inputRef={commentInputRef}
      />

      {post.caption && (
        <div className="text-sm px-3 sm:px-0 mt-1">
          <div className="inline-flex items-center gap-1">
            <ProfileHoverCard user={post.user}>
              <Link
                href={`/dashboard/${username}`}
                className="font-semibold hover:underline"
              >
                {username}
              </Link>
            </ProfileHoverCard>
            {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
            <span>{post.caption}</span>
            {post.tags && post.tags.length > 0 && (
              <span className="text-neutral-500 dark:text-neutral-400">
                with{" "}
                {post.tags.length === 1 ? (
                  <ProfileHoverCard user={post.tags[0].user}>
                    <Link
                      href={`/dashboard/${post.tags[0].user.username}`}
                      className="font-semibold hover:underline"
                    >
                      {post.tags[0].user.username}
                      {post.tags[0].user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </Link>
                  </ProfileHoverCard>
                ) : (
                  <button
                    onClick={() => setShowTaggedModal(true)}
                    className="font-semibold hover:underline"
                  >
                    {post.tags.length} others
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {post.comments.length > 0 && (
        <Link
          href={`/dashboard/p/${post.id}`}
          className="text-sm text-neutral-500 dark:text-neutral-400 px-3 sm:px-0 hover:underline mt-1"
        >
          View all {post.comments.length} comments
        </Link>
      )}

      {/* Only show comment input, hide comment previews on initial load */}
      <div className="mt-1">
        <Comments
          postId={post.id}
          comments={[]}
          user={session?.user}
          postUserId={post.user.id}
          inputRef={commentInputRef}
          showPreview={false}
        />
      </div>

      {post.tags && post.tags.length > 0 && (
        <TaggedUsersModal
          isOpen={showTaggedModal}
          onClose={() => setShowTaggedModal(false)}
          tags={post.tags}
        />
      )}
    </div>
  );
}

export default Post;
