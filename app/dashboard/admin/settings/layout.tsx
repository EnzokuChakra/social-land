import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated and has MASTER_ADMIN role
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "MASTER_ADMIN") {
    redirect("/dashboard/admin");
  }
  
  return (
    <div>
      {children}
    </div>
  );
} 