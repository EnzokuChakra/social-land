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
    <main className="flex-1 lg:ml-[244px] lg:pl-0 pl-[72px] relative bg-white dark:bg-black">
      <div className="h-full flex flex-col">
        {/* Header Section */}
        <div className="fixed top-0 z-30 flex w-full lg:w-[calc(100%-244px)] bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800">
          <div className="flex items-center justify-between w-full px-4 md:px-10 py-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/${session.user.username}`}
                className="text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-black dark:text-white">Edit profile</h1>
            </div>
            {profile.verified ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 dark:bg-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">Verified</span>
              </div>
            ) : (
              <Link 
                href="/dashboard/verify" 
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Get verified</span>
              </Link>
            )}
          </div>
        </div>

        {/* Main Content with proper spacing from fixed header */}
        <div className="pt-[73px] min-h-screen bg-white dark:bg-black">
          <div className="max-w-[800px] mx-auto px-4 md:px-10 py-6">
            <div className="bg-white dark:bg-black rounded-xl p-8 border border-gray-200 dark:border-neutral-800">
              <ProfileForm profile={profile} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default EditProfile;
