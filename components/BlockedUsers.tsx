"use client";

import { UserMinus } from "lucide-react";

function BlockedUsers() {
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
        <div className="p-8 sm:p-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="py-12">
              <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-black border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                  🚧 Under Construction 🚧
                </p>
                <p className="mt-2 text-neutral-500 dark:text-neutral-500 text-sm">
                  This feature is coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlockedUsers; 