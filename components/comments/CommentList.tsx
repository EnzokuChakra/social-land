"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";

interface User {
  id: string;
  username: string;
  image: string | null;
  name: string | null;
  verified: boolean;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No comments yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={comment.user.image || "/images/placeholder-avatar.png"} 
              alt={comment.user.username} 
            />
            <AvatarFallback>
              {comment.user.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/dashboard/${comment.user.username}`}
                className="font-medium hover:underline"
              >
                {comment.user.username}
              </Link>
              {comment.user.verified && <VerifiedBadge />}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm mt-1">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 