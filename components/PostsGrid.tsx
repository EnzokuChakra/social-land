"use client";

import { PostWithExtras } from "@/lib/definitions";
import { HeartIcon, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { CustomLoader } from "./ui/custom-loader";

export function PostsGrid({ posts: initialPosts }: { posts: PostWithExtras[] | undefined }) {
  const [posts, setPosts] = useState<PostWithExtras[]>(initialPosts?.slice(0, 12) || []);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView();

  // Update posts when initialPosts changes
  useEffect(() => {
    if (initialPosts) {
      const sortedPosts = [...initialPosts].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPosts(sortedPosts.slice(0, 12));
      setHasMore(sortedPosts.length > 12);
    }
  }, [initialPosts]);

  useEffect(() => {
    if (inView && hasMore && !loading && initialPosts) {
      loadMorePosts();
    }
  }, [inView, hasMore, loading, initialPosts]);

  const loadMorePosts = () => {
    setLoading(true);
    const nextPage = page + 1;
    const start = page * 12;
    const end = start + 12;
    const newPosts = initialPosts?.slice(start, end) || [];
    
    if (newPosts.length > 0) {
      setPosts(prev => [...prev, ...newPosts]);
      setPage(nextPage);
      setHasMore(initialPosts!.length > end);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 md:gap-1 lg:gap-2 mt-8">
        {posts.map((post, index) => (
          <Link
            href={`/dashboard/p/${post.id}`}
            key={post.id}
            className="relative aspect-square group"
            onMouseEnter={() => setHoveredPostId(post.id)}
            onMouseLeave={() => setHoveredPostId(null)}
          >
            <Image
              src={post.fileUrl}
              alt={`Post ${index + 1}`}
              fill
              priority={index === 0}
              sizes="(max-width: 768px) 33vw, 25vw"
              className="object-cover"
            />

            <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${hoveredPostId === post.id ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-0 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 font-bold text-white">
                  <HeartIcon className="w-6 h-6 fill-white text-white" />
                  <p className="text-base">{post.likes?.length || 0}</p>
                </div>
                <div className="flex items-center gap-2 font-bold text-white">
                  <MessageCircle className="w-6 h-6 fill-transparent text-white" />
                  <p className="text-base">{post.comments?.length || 0}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <CustomLoader size="default" />
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !loading && (
        <div ref={ref} className="h-10" />
      )}
    </>
  );
}

export default PostsGrid;
