"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNavbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800" suppressHydrationWarning>
      <div className="flex items-center justify-around h-14" suppressHydrationWarning>
        <Link 
          href="/dashboard" 
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full pt-1 hover:opacity-75 transition",
            isActive("/dashboard") && pathname === "/dashboard" ? "text-black dark:text-white" : "text-neutral-500"
          )}
        >
          <Home className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/dashboard/explore" 
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full pt-1 hover:opacity-75 transition",
            isActive("/dashboard/explore") ? "text-black dark:text-white" : "text-neutral-500"
          )}
        >
          <Search className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/dashboard/create" 
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full pt-1 hover:opacity-75 transition",
            isActive("/dashboard/create") ? "text-black dark:text-white" : "text-neutral-500"
          )}
        >
          <PlusSquare className="w-6 h-6" />
        </Link>
        
        <Link 
          href="/dashboard/notifications" 
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full pt-1 hover:opacity-75 transition",
            isActive("/dashboard/notifications") ? "text-black dark:text-white" : "text-neutral-500"
          )}
        >
          <Heart className="w-6 h-6" />
        </Link>
        
        <Link 
          href={`/dashboard/${pathname.split("/")[2] || ""}`}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full pt-1 hover:opacity-75 transition",
            isActive(`/dashboard/${pathname.split("/")[2]}`) && pathname.split("/").length === 3
              ? "text-black dark:text-white" 
              : "text-neutral-500"
          )}
        >
          <User className="w-6 h-6" />
        </Link>
      </div>
    </nav>
  );
} 