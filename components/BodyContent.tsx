"use client";

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";
import SessionProvider from "@/components/SessionProvider";
import Providers from "@/app/providers";
import StoryModal from "@/components/modals/StoryModal";
import EditProfileModal from "@/components/modals/EditProfileModal";
import { NavbarProvider } from "@/lib/hooks/use-navbar";
import { useEffect, useState, Suspense } from "react";
import MobileHeader from "@/components/MobileHeader";

export default function BodyContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Suspense fallback={null}>
      <SessionProvider>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <NavbarProvider>
                <div className="min-h-screen pt-14 md:pt-0">
                  <MobileHeader />
                  {children}
                  {mounted && (
                    <Toaster 
                      position="bottom-right" 
                      richColors 
                      closeButton 
                      visibleToasts={3}
                      duration={3000}
                    />
                  )}
                  <Suspense fallback={null}>
                    <StoryModal />
                    <EditProfileModal />
                  </Suspense>
                </div>
              </NavbarProvider>
            </AuthProvider>
          </ThemeProvider>
        </Providers>
      </SessionProvider>
    </Suspense>
  );
} 