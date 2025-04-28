import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReelsFeed from "@/components/reels/ReelsFeed";
import { db } from "@/lib/db";
import { UserWithFollows } from "@/lib/definitions";

export default async function ReelsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  // Check if reels are enabled
  const reelsSetting = await db.setting.findUnique({
    where: { key: "reelsEnabled" }
  });

  // If reels are disabled, redirect to dashboard
  if (reelsSetting?.value === "false") {
    redirect("/dashboard");
  }

  return (
    <div className="h-full">
      <ReelsFeed />
    </div>
  );
} 