import { auth } from "@/lib/auth";
import { fetchProfile } from "@/lib/data";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense, ReactNode } from "react";
import PageLayout from "@/components/PageLayout";

interface Props {
  children: ReactNode;
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  noStore();
  const username = decodeURIComponent(params.username);
  const profile = await fetchProfile(username);
  
  if (!profile) {
    return {
      title: "User not found • Instagram Clone",
    };
  }
  
  return {
    title: `${profile.username} • Instagram Clone`,
  };
}

function ProfileHeader() {
  return <Header />;
}

export default async function ProfileLayout({ children, params }: Props) {
  noStore();
  const username = decodeURIComponent(params.username);
  const profile = await fetchProfile(username);

  if (!profile) {
    notFound();
  }

  return (
    <PageLayout>
      <div className="flex flex-col min-h-screen bg-white dark:bg-black">
        <Suspense fallback={<div>Loading...</div>}>
          <ProfileHeader />
        </Suspense>
        {children}
      </div>
    </PageLayout>
  );
}
