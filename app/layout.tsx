import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import BodyContent from "@/components/BodyContent";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GoogleAnalytics } from '@next/third-parties/google'
import { NotificationsProvider } from '@/context/notifications-context';
import { MaintenanceProvider } from "@/lib/contexts/maintenance-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Land",
  description: "A beautiful social media platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)} suppressHydrationWarning>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="theme-preference"
          >
            <NotificationsProvider>
              <MaintenanceProvider>
                <BodyContent>
                  {children}
                </BodyContent>
              </MaintenanceProvider>
            </NotificationsProvider>
          </ThemeProvider>
        </SessionProvider>
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      </body>
    </html>
  );
}
