"use client";

import Link from "next/link";
import PostOptions from "./PostOptions";
import UserAvatar from "./UserAvatar";
import { useSession } from "next-auth/react";
import { PostWithExtras } from "@/lib/definitions";
import Timestamp from "./Timestamp";
import VerifiedBadge from "./VerifiedBadge";
import { useState, useEffect, useMemo } from "react";

function MiniPost({ post }: { post: PostWithExtras }) {
  const username = post.user.username;
  const href = `/dashboard/${username}`;
  const { data: session, status } = useSession();
  const user = session?.user;
  const [viewedStories, setViewedStories] = useState<Record<string, boolean>>({});
  
  // Check if there are unviewed stories
  const hasUnviewedStories = useMemo(() => {
    if (!post.user.hasActiveStory || !session?.user?.id) return false;
    if (typeof window === 'undefined') return false;
    
    const storageKey = `viewed_stories_${post.user.id}_${session.user.id}`;
    const storedViewedStories = localStorage.getItem(storageKey);
    
    if (!storedViewedStories) return true;
    
    try {
      return false; // Always show gray ring in MiniPost for consistency
    } catch (error) {
      return true;
    }
  }, [post.user.hasActiveStory, post.user.id, session?.user?.id]);

  if (!user) return null;

  return (
    <div className="group p-3 px-3.5  flex items-start space-x-2.5">
      <Link href={href}>
        <UserAvatar 
          user={post.user} 
          showStoryRing={post.user.hasActiveStory}
          hasUnviewedStories={hasUnviewedStories}
          className="h-8 w-8"
        />
      </Link>
      <div className="space-y-1.5">
        <div className="flex flex-wrap text-sm">
          <Link href={href} className="font-semibold hover:underline">
            {username}
          </Link>
          {post.user.verified && (
            <VerifiedBadge className="h-3.5 w-3.5 mx-1 flex-shrink-0" isDashboardPostHeader={true} />
          )}
          {post.caption && (
            <span className="text-neutral-800 dark:text-neutral-200 break-words">
              {post.caption}
            </span>
          )}
        </div>
        <div className="flex h-5 items-center space-x-2.5">
          <Timestamp createdAt={post.createdAt} />
          <PostOptions
            post={post}
            userId={user.id}
            className="hidden group-hover:inline"
          />
        </div>
      </div>
    </div>
  );
}

export default MiniPost;
