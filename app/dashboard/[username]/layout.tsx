import { auth } from "@/lib/auth";
import { fetchProfile } from "@/lib/data";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense, ReactNode } from "react";
import PageLayout from "@/components/PageLayout";
import { NavbarProvider } from "@/components/NavbarProvider";

interface Props {
  children: ReactNode;
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  noStore();
  try {
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username);
    const profile = await fetchProfile(decodedUsername);
    
    if (!profile) {
      return {
        title: "User not found • Social Land",
      };
    }
    
    return {
      title: `${profile.username} • Social Land`,
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: "Social Land",
    };
  }
}

function ProfileHeader() {
  return <Header />;
}

export default async function ProfileLayout({ children, params }: Props) {
  noStore();
  try {
    const { username } = await params;
    const decodedUsername = decodeURIComponent(username);
    const profile = await fetchProfile(decodedUsername);

    if (!profile) {
      notFound();
    }

    return (
      <NavbarProvider>
        <PageLayout>
          <div className="flex flex-col min-h-screen bg-white dark:bg-black">
            <Suspense fallback={<div>Loading...</div>}>
              <ProfileHeader />
            </Suspense>
            {children}
          </div>
        </PageLayout>
      </NavbarProvider>
    );
  } catch (error) {
    console.error('[ProfileLayout] Error:', error);
    notFound();
  }
}
