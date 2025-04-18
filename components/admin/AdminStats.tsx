"use client";

import { Card } from "@/components/ui/card";
import { Users, Image, MessageCircle, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Total Users",
    value: "12,345",
    change: "+12.5%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Active Posts",
    value: "45,678",
    change: "+8.2%",
    trend: "up",
    icon: Image,
  },
  {
    title: "Comments",
    value: "89,012",
    change: "+15.3%",
    trend: "up",
    icon: MessageCircle,
  },
  {
    title: "Engagement Rate",
    value: "4.8%",
    change: "+2.1%",
    trend: "up",
    icon: TrendingUp,
  },
];

export default function AdminStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.trend === "up" ? "text-green-500" : "text-red-500"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold mt-4">{stat.value}</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{stat.title}</p>
          </Card>
        );
      })}
    </div>
  );
} 