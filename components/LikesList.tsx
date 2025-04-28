import { useEffect, useState, useRef, useCallback } from "react";
import { User } from "@/lib/definitions";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

type BaseLike = {
  id: string;
  user_id: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    verified: boolean;
    isFollowing?: boolean;
    hasPendingRequest?: boolean;
    isPrivate?: boolean;
  };
  createdAt: string | Date;
};

type Props = {
  likes: BaseLike[];
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  className?: string;
};

const ITEMS_PER_PAGE = 20;

export default function LikesList({ likes, onLoadMore, hasMore = false, className }: Props) {
  const { data: session } = useSession();
  const [visibleLikes, setVisibleLikes] = useState<BaseLike[]>([]);
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleLikes(likes.slice(0, page * ITEMS_PER_PAGE));
  }, [likes, page]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && onLoadMore) {
      setPage(prev => prev + 1);
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  useEffect(() => {
    observer.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [handleObserver]);

  return (
    <div className={cn("space-y-1", className)}>
      {visibleLikes.length > 0 ? (
        <>
          {visibleLikes
            .sort((a, b) => {
              // Current user first
              if (a.user_id === session?.user?.id) return -1;
              if (b.user_id === session?.user?.id) return 1;
              
              // Then sort by most recent likes (newest first)
              const dateA = new Date(a.createdAt).getTime();
              const dateB = new Date(b.createdAt).getTime();
              return dateB - dateA;
            })
            .map((like) => (
              <div
                key={like.id}
                className="flex items-center justify-between p-4 hover:bg-neutral-900 transition border border-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    user={like.user}
                    className="h-11 w-11"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{like.user.username}</span>
                    {like.user.name && (
                      <span className="text-sm text-neutral-400">{like.user.name}</span>
                    )}
                  </div>
                </div>
                {session?.user?.id !== like.user.id && (
                  <FollowButton
                    followingId={like.user.id}
                    isFollowing={like.user.isFollowing || false}
                    hasPendingRequest={like.user.hasPendingRequest || false}
                    isPrivate={like.user.isPrivate || false}
                    className="h-9 min-w-[104px]"
                    variant="profile"
                  />
                )}
              </div>
            ))}
          {hasMore && (
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 text-center text-neutral-400">
          No likes yet
        </div>
      )}
    </div>
  );
} 