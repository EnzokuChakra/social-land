import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabs = [
  { title: "Edit profile", value: "edit-profile" },
  { title: "Professional account", value: "professional-account" },
  { title: "Notifications", value: "notifications" },
  { title: "Privacy and security", value: "privacy-and-security" },
  { title: "Login activity", value: "login-activity" },
  { title: "Emails from Social Land", value: "emails-from-social-land" },
];

function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      {children}
    </div>
  );
}

export default SettingsLayout;
