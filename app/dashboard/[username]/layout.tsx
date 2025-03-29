import { auth } from "@/lib/auth";
import { fetchProfile } from "@/lib/data";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";

interface Props {
  children: React.ReactNode;
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
      <div className="flex flex-col min-h-screen bg-white dark:bg-black">
        {children}
      </div>
    );
  } catch (error) {
    console.error('[ProfileLayout] Error:', error);
    notFound();
  }
}
