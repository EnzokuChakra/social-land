import { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = {
  title: "Admin Settings",
  description: "Manage site settings and maintenance mode",
};

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      <SettingsForm />
    </div>
  );
} 