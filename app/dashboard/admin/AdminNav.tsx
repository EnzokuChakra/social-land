"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BadgeCheck, 
  Film, 
  Flag, 
  LayoutDashboard,
  Settings,
  AlertCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isMasterAdmin = userRole === "MASTER_ADMIN";
  const isAdmin = userRole === "ADMIN" || userRole === "MASTER_ADMIN";
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Fetch maintenance mode status
  useEffect(() => {
    async function checkMaintenanceMode() {
      try {
        const response = await fetch('/api/admin/settings/maintenance');
        if (response.ok) {
          const data = await response.json();
          setMaintenanceMode(data.maintenanceMode);
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      }
    }
    
    checkMaintenanceMode();
    
    // Check every 30 seconds
    const interval = setInterval(checkMaintenanceMode, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const isActive = (path: string) => {
    if (path === "/dashboard/admin" && pathname === "/dashboard/admin") {
      return true;
    }
    if (path !== "/dashboard/admin" && pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  const tabs = [
    {
      value: "/dashboard/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      roles: ["MODERATOR", "ADMIN", "MASTER_ADMIN"]
    },
    {
      value: "/dashboard/admin/users",
      label: "Users",
      icon: <Users className="h-4 w-4" />,
      roles: ["ADMIN", "MASTER_ADMIN"]
    },
    {
      value: "/dashboard/admin/verified",
      label: "Verification",
      icon: <BadgeCheck className="h-4 w-4" />,
      roles: ["MASTER_ADMIN"]
    },
    {
      value: "/dashboard/admin/reels",
      label: "Reels",
      icon: <Film className="h-4 w-4" />,
      roles: ["MODERATOR", "ADMIN", "MASTER_ADMIN"]
    },
    {
      value: "/dashboard/admin/reports",
      label: "Reports",
      icon: <Flag className="h-4 w-4" />,
      roles: ["ADMIN", "MASTER_ADMIN"]
    },
    {
      value: "/dashboard/admin/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      roles: ["MASTER_ADMIN"]
    }
  ];

  // Filter tabs based on user role
  const filteredTabs = tabs.filter(tab => tab.roles.includes(userRole || ""));

  return (
    <div className={cn(
      "border-b dark:border-neutral-800 pb-6",
      "bg-white dark:bg-black rounded-lg"
    )}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        
        {maintenanceMode && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-1 px-3 py-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Maintenance Mode Active
          </Badge>
        )}
      </div>
      
      <Tabs 
        defaultValue={tabs.find(tab => isActive(tab.value))?.value || "/dashboard/admin"} 
        className="w-full"
      >
        <TabsList className={cn(
          "w-full h-auto p-2 bg-neutral-100 dark:bg-neutral-900",
          "grid grid-flow-col auto-cols-fr gap-2",
          "overflow-x-auto rounded-lg"
        )}>
          {filteredTabs.map((tab) => (
            <Link href={tab.value} key={tab.value} className="focus:outline-none">
              <TabsTrigger 
                value={tab.value}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5",
                  "data-[state=active]:bg-white dark:data-[state=active]:bg-black",
                  "data-[state=active]:text-primary",
                  "data-[state=active]:shadow-sm",
                  "rounded-md transition-all duration-200",
                  "hover:bg-white/50 dark:hover:bg-neutral-800/50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
} 