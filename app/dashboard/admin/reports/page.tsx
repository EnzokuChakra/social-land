import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsList } from "@/components/ReportsList";

export default async function ReportsPage() {
  const session = await auth();
  
  if (!session?.user || !["MODERATOR", "ADMIN", "MASTER_ADMIN"].includes(session.user.role as string)) {
    redirect("/dashboard");
  }

  return (
    <div className="px-4 py-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reported Posts</h1>
      <ReportsList />
    </div>
  );
} 