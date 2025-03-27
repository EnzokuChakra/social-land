"use client";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminStats from "@/components/admin/AdminStats";
import AdminCharts from "@/components/admin/AdminCharts";
import AdminTables from "@/components/admin/AdminTables";

export default function AdminDashboardContent() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <div className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <AdminHeader />
        <div className="space-y-8">
          <AdminStats />
          <AdminCharts />
          <AdminTables />
        </div>
      </div>
    </div>
  );
} 