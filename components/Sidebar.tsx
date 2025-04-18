import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusSquare, Heart, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
  {
    label: 'Home',
    icon: Home,
    href: '/dashboard',
  },
  {
    label: 'Search',
    icon: Search,
    href: '/dashboard/search',
  },
  {
    label: 'Create',
    icon: PlusSquare,
    href: '/dashboard/create',
  },
  {
    label: 'Activity',
    icon: Heart,
    href: '/dashboard/activity',
  },
  {
    label: 'Profile',
    icon: User,
    href: '/dashboard/profile',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 flex flex-col h-full text-primary bg-secondary">
      <div className="p-3 flex-1 flex justify-center">
        <div className="space-y-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-muted-foreground text-xs group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                pathname === route.href && "bg-primary/10 text-primary"
              )}
            >
              <div className="flex flex-col gap-y-2 items-center flex-1">
                <route.icon className="h-5 w-5" />
                <span>{route.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 