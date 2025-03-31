import { Skeleton } from "@/components/ui/skeleton";

export default function EventLoading() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
} 