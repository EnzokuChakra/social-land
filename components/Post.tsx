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

function Post({ post }: { post: PostWithExtras }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username = post.user.username;
  const commentInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [showTaggedModal, setShowTaggedModal] = useState(false);
  const [allLikes, setallLikes] = useState(post.likes.length);

  if (!session?.user) return null;

  // Get caption length to determine display style
  const isCaptionShort = post.caption ? post.caption.length < 30 : true;

  // Format tagged users text
  const getTaggedText = () => {
    if (!post.tags || post.tags.length === 0) return null;
    if (post.tags.length === 1) return post.tags[0].user.username;
    if (post.tags.length <= 3) {
      return post.tags.map((tag) => tag.user.username).join(", ");
    }
    return `${post.tags[0].user.username} and ${post.tags.length - 1} others`;
  };

  // Add proper type for tags
  const handleTagClick = (tag: PostTag) => {
    // Handle tag click
    router.push(`/dashboard/${tag.user.username}`);
  };

  return (
    <div className="flex flex-col space-y-2 mb-7 border-b border-gray-200 dark:border-neutral-800 pb-4">
      <div className="flex items-center justify-between px-3 sm:px-0 py-2">
        <div className="flex flex-col">
          <div className="flex space-x-3 items-center group">
            <Link
              href={`/dashboard/${username}`}
              className="group-hover:opacity-90 transition-opacity"
            >
              <UserAvatar user={post.user} />
            </Link>
            <div className="text-sm">
              <div className="flex items-center gap-1 flex-wrap">
                <ProfileHoverCard user={post.user}>
                  <Link
                    href={`/dashboard/${username}`}
                    className="font-semibold hover:underline"
                  >
                    {username}
                  </Link>
                </ProfileHoverCard>
                {post.user.verified && (
                  <VerifiedBadge className="h-3.5 w-3.5" />
                )}
                {post.tags && post.tags.length > 0 && (
                  <>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      with
                    </span>
                    {post.tags.length === 1 ? (
                      <ProfileHoverCard user={post.tags[0].user}>
                        <Link
                          href={`/dashboard/${post.tags[0].user.username}`}
                          className="font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <span className="inline-flex items-center gap-1">
                            {post.tags[0].user.username}
                            {post.tags[0].user.verified && (
                              <VerifiedBadge className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </Link>
                      </ProfileHoverCard>
                    ) : (
                      <div
                        onClick={() => setShowTaggedModal(true)}
                        className="font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setShowTaggedModal(true);
                          }
                        }}
                      >
                        <span>{post.tags.length} others</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {post.location && (
                <Link
                  href={`/dashboard/location/${encodeURIComponent(
                    post.location
                  )}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {post.location}
                </Link>
              )}
            </div>
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
            <Link
              href={`/dashboard/${username}`}
              className="font-semibold hover:underline"
            >
              {username}
            </Link>
            {post.user.verified && <VerifiedBadge className="h-3.5 w-3.5" />}
          </div>
          <span className="ml-1.5">{post.caption}</span>
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
