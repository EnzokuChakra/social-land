"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, BarChart, PieChart } from "lucide-react";

const chartData = {
  users: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    data: [1000, 1200, 1500, 1800, 2200, 2500],
  },
  engagement: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    data: [65, 78, 82, 75, 88, 92, 85],
  },
  content: {
    labels: ["Posts", "Comments", "Likes", "Shares"],
    data: [45, 25, 20, 10],
  },
};

export default function AdminCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">User Growth</h3>
          <Tabs defaultValue="weekly" className="w-[200px]">
            <TabsList className="w-full">
              <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="flex-1">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px] flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <LineChart className="w-8 h-8 text-gray-400" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Engagement Overview</h3>
          <Tabs defaultValue="daily" className="w-[200px]">
            <TabsList className="w-full">
              <TabsTrigger value="daily" className="flex-1">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px] flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <BarChart className="w-8 h-8 text-gray-400" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Content Distribution</h3>
          <Tabs defaultValue="all" className="w-[200px]">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="recent" className="flex-1">Recent</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px] flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <PieChart className="w-8 h-8 text-gray-400" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">User Activity</h3>
          <Tabs defaultValue="active" className="w-[200px]">
            <TabsList className="w-full">
              <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
              <TabsTrigger value="inactive" className="flex-1">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px] flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <BarChart className="w-8 h-8 text-gray-400" />
        </div>
      </Card>
    </div>
  );
} 