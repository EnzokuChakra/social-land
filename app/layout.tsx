import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import BodyContent from "@/components/BodyContent";
import { cn } from "@/lib/utils";
import MaintenanceProvider from '@/components/MaintenanceProvider';
import { ThemeProvider } from "@/components/ThemeProvider";
import { GoogleAnalytics } from '@next/third-parties/google'

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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="theme-preference"
        >
          <div className="relative flex min-h-screen flex-col" suppressHydrationWarning>
            <SessionProvider>
              <MaintenanceProvider>
                <BodyContent>
                  {children}
                </BodyContent>
              </MaintenanceProvider>
            </SessionProvider>
          </div>
        </ThemeProvider>
        <GoogleAnalytics gaId="G-XXXXXXXXXX" />
      </body>
    </html>
  );
}
