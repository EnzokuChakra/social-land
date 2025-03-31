import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import BodyContent from "@/components/BodyContent";
import EditProfileModal from "@/components/modals/EditProfileModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Land",
  description: "A beautiful social media platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="/styles/layout.css"
          precedence="high"
        />
      </head>
      <body className={cn(inter.className, "antialiased")} suppressHydrationWarning>
        <BodyContent>
          <EditProfileModal />
          {children}
        </BodyContent>
      </body>
    </html>
  );
}
