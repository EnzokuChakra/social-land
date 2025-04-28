"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useBanned, BannedProvider } from "@/lib/contexts/banned-context";
import { useSession } from "next-auth/react";

function BannedPageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isBanned, message, isLoading, error } = useBanned();

  // Redirect if not banned or user is admin
  useEffect(() => {
    if (!isLoading && (!isBanned || session?.user?.role === 'MASTER_ADMIN')) {
      router.push('/dashboard');
    }
  }, [isBanned, session, router, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-sm text-muted-foreground">Checking account status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="max-w-md w-full p-6 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connection Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <motion.div 
        className="max-w-2xl mx-auto px-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-red-500/10" />
          <h1 className="relative text-4xl font-bold mb-4">Account Banned</h1>
        </div>
        
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {message}
        </p>
      </motion.div>
    </div>
  );
}

export default function BannedPage() {
  return (
    <BannedProvider>
      <BannedPageContent />
    </BannedProvider>
  );
} 