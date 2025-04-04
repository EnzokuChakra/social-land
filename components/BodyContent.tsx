"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import Providers from "@/app/providers";
import StoryModal from "@/components/modals/StoryModal";
import EditProfileModal from "@/components/modals/EditProfileModal";
import { Suspense } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { memo } from "react";

// Memoize child components that don't need frequent updates
const MemoizedToaster = memo(() => (
  <Toaster 
    position="bottom-right" 
    richColors 
    closeButton 
    visibleToasts={3}
    duration={3000}
  />
));
MemoizedToaster.displayName = "MemoizedToaster";

const MemoizedModals = memo(() => (
  <>
    <StoryModal />
    <EditProfileModal />
    <MobileBottomNav />
  </>
));
MemoizedModals.displayName = "MemoizedModals";

export default function BodyContent({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="theme-preference"
            disableTransitionOnChange={false}
          >
            <div className="pb-14 md:pb-0">
              {children}
            </div>
            <MemoizedToaster />
            <Suspense fallback={null}>
              <MemoizedModals />
            </Suspense>
          </ThemeProvider>
        </Providers>
      </SessionProvider>
    </Suspense>
  );
} 