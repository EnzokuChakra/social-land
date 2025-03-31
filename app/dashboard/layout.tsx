import Navbar from "@/components/Navbar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileProvider } from "@/lib/contexts/profile-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <ProfileProvider>
      <div className="bg-white dark:bg-black" suppressHydrationWarning>
        <Navbar />
        <main className="transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    </ProfileProvider>
  );
}
