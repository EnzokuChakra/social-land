"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import Providers from "@/app/providers";
import StoryModal from "@/components/modals/StoryModal";
import EditProfileModal from "@/components/modals/EditProfileModal";
import { Suspense, useEffect } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { memo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from 'next-auth/react';
import { HydrationSafeDiv } from "./HydrationSafeDiv";

// Paths where bottom nav should be hidden
const hiddenPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

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

// Separate bottom nav component with proper path checking
const BottomNavComponent = memo(() => {
  const pathname = usePathname();
  
  // More strict check to handle path variations
  if (!pathname) return null;
  
  // Check if the current path is in hidden paths or starts with any of them
  const shouldHide = hiddenPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  if (shouldHide) return null;
  
  return <MobileBottomNav />;
});
BottomNavComponent.displayName = "BottomNavComponent";

const MemoizedModals = memo(() => (
  <>
    <StoryModal />
    <EditProfileModal />
  </>
));
MemoizedModals.displayName = "MemoizedModals";

export default function BodyContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={null}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="theme-preference"
            disableTransitionOnChange={false}
          >
            <HydrationSafeDiv className="pb-14 md:pb-0">
              {children}
            </HydrationSafeDiv>
            <MemoizedToaster />
            <Suspense fallback={null}>
              <MemoizedModals />
              <BottomNavComponent />
            </Suspense>
          </ThemeProvider>
        </Providers>
      </Suspense>
    </div>
  );
} 