"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import ProfileForm from "@/components/ProfileForm";
import BlockedUsers from "@/components/BlockedUsers";
import PasswordForm from "@/components/PasswordForm";
import { UserWithExtras } from "@/lib/definitions";
import { ChevronLeft, CheckCircle2, Clock } from "lucide-react";

type Tab = "profile" | "blocked" | "password";

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
        <div className="flex flex-col space-y-4 p-4 pt-12">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === "profile" 
                    ? "bg-blue-500 text-white hover:bg-blue-600" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                Profile Info
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === "password" 
                    ? "bg-blue-500 text-white hover:bg-blue-600" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                Password
              </button>
              <button
                onClick={() => setActiveTab("blocked")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                  activeTab === "blocked" 
                    ? "bg-blue-500 text-white hover:bg-blue-600" 
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                Blocked Users
              </button>
            </div>
          </div>

          {activeTab === "profile" ? (
            <div>
              <ProfileForm profile={profile} />
            </div>
          ) : activeTab === "password" ? (
            <div>
              <PasswordForm />
            </div>
          ) : (
            <div>
              <BlockedUsers />
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 