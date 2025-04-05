"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ProfileForm from "@/components/ProfileForm";
import BlockedUsers from "@/components/BlockedUsers";
import { UserWithExtras } from "@/lib/definitions";
import { ChevronLeft, CheckCircle2, Clock } from "lucide-react";

type Tab = "profile" | "blocked";

export default function EditProfileContent({ profile }: { profile: UserWithExtras }) {
  const { data: session } = useSession();
  const { isCollapsed } = useNavbar();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const router = useRouter();

  if (!profile) {
    return (
      <main className="flex-1 bg-white dark:bg-black">
        <div className="container max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-white dark:bg-black">
      <div className="container max-w-4xl mx-auto">
        <div className="flex flex-col space-y-4 p-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                activeTab === "profile" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-black text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-900"
              )}
            >
              Profile Info
            </button>
            <button
              onClick={() => setActiveTab("blocked")}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                activeTab === "blocked" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-black text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-900"
              )}
            >
              Blocked Users
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "profile" ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ProfileForm profile={profile} />
              </motion.div>
            ) : (
              <motion.div
                key="blocked"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <BlockedUsers />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
} 