"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomLoader } from "@/components/ui/custom-loader";

type Post = {
  id: string;
  fileUrl: string;
  user: {
    id: string;
    username: string | null;
    image: string | null;
    verified: boolean;
  };
  _count: {
    likes: number;
    comments: number;
  };
};

export default function ExplorePage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await fetch('/api/posts/explore?page=1&limit=24');
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <CustomLoader size="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="container max-w-7xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl px-4">
      <div className="grid grid-cols-3 gap-1 md:gap-2 mt-8">
        {posts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square group cursor-pointer bg-neutral-100 dark:bg-neutral-900"
          >
            <Link href={`/dashboard/p/${post.id}`} className="relative block w-full h-full">
              <Image
                src={post.fileUrl}
                alt="Post"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 25vw"
                priority={true}
              />
              <div
                className={cn(
                  "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity",
                  "flex items-center justify-center gap-6 text-white"
                )}
              >
                <div className="flex items-center gap-1">
                  <Heart className="h-5 w-5 fill-white" />
                  <span className="font-semibold">{post._count.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-5 w-5 fill-white" />
                  <span className="font-semibold">{post._count.comments}</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
} 