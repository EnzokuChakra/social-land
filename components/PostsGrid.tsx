"use client";

import { PostWithExtras } from "@/lib/definitions";
import { HeartIcon, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function PostsGrid({ posts }: { posts: PostWithExtras[] | undefined }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (posts?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 max-w-3xl lg:max-w-4xl mx-auto pb-20">
        <p className="font-semibold text-sm text-neutral-400">No more posts.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1 lg:gap-2 mt-8">
      {posts?.map((post, index) => (
        <Link
          href={`/dashboard/p/${post.id}`}
          key={post.id}
          className="relative aspect-square"
        >
          <Image
            src={post.fileUrl}
            alt={`Post ${index + 1}`}
            fill
            priority={index === 0}
            sizes="(max-width: 768px) 33vw, 25vw"
            className="object-cover"
          />

          <div className="absolute inset-0 hover:bg-black/20 group">
            <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 font-bold text-white">
                <HeartIcon className="w-5 h-5 fill-white text-white" />
                <p>{post.likes.length}</p>
              </div>
              <div className="flex items-center gap-1 font-bold text-white">
                <MessageCircle className="w-5 h-5 fill-transparent text-white" />
                <p>{post.comments.length}</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default PostsGrid;
