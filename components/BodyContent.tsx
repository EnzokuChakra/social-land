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

  useEffect(() => {
    // Debug code for iframe detection
    if (typeof window === 'undefined') return;

    try {
      const isInIframe = window !== window.parent;
      console.log('[DEBUG] Page environment check:', {
        isInIframe,
        sessionStatus: status,
        isAuthenticated: !!session,
        userId: session?.user?.id,
        url: window.location.href,
        referrer: document.referrer,
        cookies: document.cookie ? 'Available' : 'Not available',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      // Check for access to cookies
      if (isInIframe) {
        console.log('[DEBUG] Running in iframe mode, testing cookie access');
        try {
          document.cookie = "iframe_test=1; path=/; SameSite=None; Secure";
          const hasCookie = document.cookie.includes('iframe_test');
          console.log('[DEBUG] Cookie test result:', { 
            cookieAccess: hasCookie ? 'Success' : 'Failed',
            cookieValue: document.cookie
          });
        } catch (e) {
          console.log('[DEBUG] Cookie access error:', e);
        }
      }
    } catch (error) {
      console.log('[DEBUG] Environment detection error:', error);
    }
  }, [session, status]);

  return (
    <Suspense fallback={null}>
      <Providers>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="theme-preference"
          disableTransitionOnChange={false}
        >
          <HydrationSafeDiv className="pt-16 md:pt-20 pb-14 md:pb-0">
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
  );
} 