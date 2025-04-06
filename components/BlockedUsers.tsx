"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserMinus } from "lucide-react";
import { User } from "@/lib/definitions";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function BlockedUsers() {
  const { data: session } = useSession();
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const response = await fetch("/api/users/block/list");
        if (!response.ok) {
          throw new Error("Failed to fetch blocked users");
        }
        const data = await response.json();
        // Transform the data to match the User type
        const transformedUsers = data.map((block: any) => ({
          id: block.blocked.id,
          username: block.blocked.username,
          name: block.blocked.name,
          image: block.blocked.image,
          verified: block.blocked.verified
        }));
        setBlockedUsers(transformedUsers);
      } catch (error) {
        console.error("Error fetching blocked users:", error);
        toast.error("Failed to load blocked users");
        setBlockedUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockedUsers();
  }, []);

  const handleUnblock = async (userId: string) => {
    try {
      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to unblock user");
      }

      const data = await response.text();
      if (data.includes("unblocked")) {
        toast.success("User unblocked successfully");
        setBlockedUsers(prev => prev.filter(user => user.id !== userId));
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to unblock user");
    }
  };

  return (
    <div className="bg-white dark:bg-black">
      <div className="flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-black p-8 sm:p-10 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex flex-col items-center gap-6 max-w-3xl mx-auto text-center">
            <div className="p-4 rounded-full bg-black/5 dark:bg-white/5">
              <UserMinus className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Blocked Users
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                Manage your blocked users list. Blocked users cannot see your posts or interact with your profile.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto w-full p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white" />
            </div>
          ) : !blockedUsers || blockedUsers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-black border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                  No blocked users
                </p>
                <p className="mt-2 text-neutral-500 dark:text-neutral-500 text-sm">
                  You haven't blocked any users yet
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {blockedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar user={user} />
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      {user.name && (
                        <p className="text-sm text-neutral-500">{user.name}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleUnblock(user.id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlockedUsers; 