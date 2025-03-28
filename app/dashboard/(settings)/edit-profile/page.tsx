import { auth } from "@/lib/auth";
import ProfileForm from "@/components/ProfileForm";
import { fetchProfile } from "@/lib/data";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Edit profile",
  description: "Edit profile",
};

async function EditProfile() {
  const session = await auth();
  if (!session?.user?.username) {
    redirect("/login");
  }

  const profile = await fetchProfile(session.user.username);
  if (!profile) {
    notFound();
  }

  return (
    <main className="flex-1 lg:ml-[244px] lg:pl-0 pl-0 md:pl-[72px] relative bg-white dark:bg-black min-h-screen">
      {/* Header Section */}
      <div className="fixed top-0 z-30 flex w-full lg:w-[calc(100%-244px)] bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800">
        <div className="flex items-center justify-between w-full px-4 py-2 md:px-10 md:py-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href={`/dashboard/${session.user.username}`}
              className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg md:text-xl font-semibold text-black dark:text-white">Edit profile</h1>
          </div>
          {profile.verified ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1 rounded-full bg-green-500/10 dark:bg-green-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 text-xs md:text-sm font-medium">Verified</span>
            </div>
          ) : (
            <Link 
              href="/dashboard/verify" 
              className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
              <span className="text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium">Get verified</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-[32px] md:pt-[44px] bg-white dark:bg-black pb-16 md:pb-0">
        <div className="max-w-[800px] mx-auto">
          <ProfileForm profile={profile} />
        </div>
      </div>
    </main>
  );
}

export default EditProfile;
