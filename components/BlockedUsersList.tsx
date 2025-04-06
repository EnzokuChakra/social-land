"use client";

import { useEffect, useState } from "react";
import { User } from "@prisma/client";
import { BlockButton } from "./BlockButton";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface BlockedUser extends User {
  blockedAt: Date;
}

export default function BlockedUsersList() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const response = await fetch("/api/users/blocked");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch blocked users");
        }

        setBlockedUsers(data);
      } catch (error) {
        toast.error("Failed to load blocked users");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center p-4 text-neutral-500">
        No blocked users
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blockedUsers.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800"
        >
          <div className="flex items-center gap-3">
            <UserAvatar
              user={user}
              className="h-10 w-10"
            />
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-neutral-500">@{user.username}</p>
            </div>
          </div>
          <BlockButton
            userId={user.id}
            isBlocked={true}
            className="w-auto"
          />
        </div>
      ))}
    </div>
  );
} 