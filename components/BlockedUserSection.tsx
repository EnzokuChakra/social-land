"use client";

import { UserX } from "lucide-react";
import UnblockButton from "./UnblockButton";

interface BlockedUserSectionProps {
  userId: string;
}

export default function BlockedUserSection({ userId }: BlockedUserSectionProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border-t border-neutral-200 dark:border-neutral-800">
      <UserX className="w-12 h-12 text-red-500 mb-4" />
      <h1 className="text-2xl font-semibold mb-2">This User is Blocked</h1>
      <p className="text-neutral-500 max-w-sm px-4">
        You have blocked this user. They cannot see your posts or interact with your profile.
      </p>
      <UnblockButton userId={userId} />
    </div>
  );
} 