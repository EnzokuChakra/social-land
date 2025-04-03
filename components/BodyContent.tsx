"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";
import SessionProvider from "@/components/SessionProvider";
import Providers from "@/app/providers";
import StoryModal from "@/components/modals/StoryModal";
import EditProfileModal from "@/components/modals/EditProfileModal";
import { NavbarProvider } from "@/lib/hooks/use-navbar";
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
      <SessionProvider>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="theme-preference"
            disableTransitionOnChange={false}
          >
            <AuthProvider>
              <NavbarProvider>
                <div className="pb-14 md:pb-0">
                  {children}
                </div>
                <MemoizedToaster />
                <Suspense fallback={null}>
                  <MemoizedModals />
                </Suspense>
              </NavbarProvider>
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </SessionProvider>
    </Suspense>
  );
} 