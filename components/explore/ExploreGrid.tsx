"use client";

import { useEffect, useState } from "react";
import { PostWithExtras, User } from "@/lib/definitions";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeartIcon } from "lucide-react";

type MinimalUser = Pick<User, 'id' | 'username' | 'image' | 'name' | 'verified' | 'isPrivate'>;

interface ExploreGridProps {
  posts: PostWithExtras[];
}

export default function ExploreGrid({ posts }: ExploreGridProps) {
  if (!posts.length) return null;

  const createPostWithUser = (user: MinimalUser): PostWithExtras => ({
    id: user.id,
    fileUrl: user.image || "",
    caption: null,
    location: null,
    aspectRatio: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    user_id: user.id,
    user: {
      ...user,
      email: "",
      password: null,
      bio: null,
      role: "USER",
      status: "NORMAL",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    likes: [],
    savedBy: [],
    comments: [],
    tags: []
  });

  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-2">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/dashboard/p/${post.id}`}
          className="relative aspect-square group"
        >
          <Image
            src={post.fileUrl}
            alt={post.caption || "Post image"}
            fill
            className="object-cover group-hover:opacity-90 transition-opacity duration-200"
          />

          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center justify-center gap-4 h-full text-white font-semibold">
              <div className="flex items-center gap-1">
                <HeartIcon className="w-5 h-5" />
                <span>{post.likes.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-5 h-5" />
                <span>{post.comments.length}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 