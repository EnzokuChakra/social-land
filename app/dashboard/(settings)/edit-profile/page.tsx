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
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      {/* Header Section */}
      <header className="fixed top-0 z-30 w-full lg:w-[calc(100%-244px)] bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800">
        <div className="h-14 px-4 flex items-center">
          <div className="flex items-center gap-3 max-w-screen-xl w-full mx-auto">
            <Link
              href={`/dashboard/${session.user.username}`}
              className="flex-shrink-0 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-black dark:text-white">
                Edit profile
              </h1>
              {profile.verified ? (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 dark:bg-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                    Verified
                  </span>
                </div>
              ) : (
                <Link 
                  href="/dashboard/verify" 
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
                    Get verified
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-14">
        <div className="w-full max-w-xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default EditProfile;
