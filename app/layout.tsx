import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import SessionProvider from "@/components/SessionProvider";
import BodyContent from "@/components/BodyContent";

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
      <head>
        <link
          rel="preload"
          href="/_next/static/css/app/layout.css"
          as="style"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SessionProvider>
          <BodyContent>
            {children}
          </BodyContent>
        </SessionProvider>
      </body>
    </html>
  );
}
