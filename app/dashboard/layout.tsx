import Navbar from "@/components/Navbar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileProvider } from "@/lib/contexts/profile-context";
import PageLayout from "@/components/PageLayout";
import { NavbarProvider } from "@/lib/hooks/use-navbar";

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
      <NavbarProvider>
        <div className="relative min-h-screen bg-white dark:bg-black" suppressHydrationWarning>
          <Navbar />
          <PageLayout>
            {children}
          </PageLayout>
        </div>
      </NavbarProvider>
    </ProfileProvider>
  );
}
