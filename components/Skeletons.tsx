import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "./ui/card";
import { Tabs, TabsList } from "./ui/tabs";
import { Separator } from "./ui/separator";

export function PostSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>

      <Skeleton className="h-[450px]" />
    </div>
  );
}

export function PostsSkeleton() {
  return (
    <>
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </>
  );
}

export function EditPostSkeleton() {
  return (
    <Dialog open>
      <DialogContent aria-describedby="edit-skeleton-description">
        <DialogHeader>
          <DialogTitle>Edit info</DialogTitle>
        </DialogHeader>
        <DialogDescription id="edit-skeleton-description">
          Loading edit post form
        </DialogDescription>

        <AspectRatio ratio={1 / 1} className="relative h-full">
          <Skeleton className="h-full w-full" />
        </AspectRatio>

        <Skeleton className="h-10 w-full" />
      </DialogContent>
    </Dialog>
  );
}

export function ViewPostSkeleton() {
  return (
    <Dialog open>
      <DialogContent 
        className="flex gap-0 flex-col md:flex-row items-start p-0 md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] bg-white dark:bg-neutral-950" 
      >
        <DialogHeader className="sr-only">
          <DialogTitle>View Post</DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 bg-black flex items-center justify-center h-[400px] md:h-full">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gray-200 dark:border-gray-800"></div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-pink-500 animate-spin"></div>
            </div>
          </div>
          <Skeleton className="absolute inset-0 w-full h-full bg-neutral-900/10" />
        </div>

        <div className="flex flex-col h-full py-4 pl-3.5 pr-6 flex-1 max-w-lg">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          </div>

          <div className="mt-8 space-y-3 flex-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-[85%]" />
                  <Skeleton className="h-3 w-[70%]" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center w-full space-x-4 mt-4">
            <div className="space-y-2.5 w-full">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-4 w-[40%]" />
              <div className="flex items-center space-x-2 mt-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 flex-1 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserAvatarSkeleton() {
  return (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

export function SinglePostSkeleton() {
  return (
    <Card className="max-w-3xl lg:max-w-4xl mx-auto hidden md:flex">
      <div className="relative overflow-hidden h-[450px] max-w-sm lg:max-w-lg  w-full">
        <Skeleton className="h-full w-full" />
      </div>

      <div className="flex max-w-sm flex-col flex-1">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
            </div>
          </div>
        </div>

        <div className="px-5 space-y-3 mt-8">
          <UserAvatarSkeleton />
          <UserAvatarSkeleton />
          <UserAvatarSkeleton />
          <UserAvatarSkeleton />
        </div>
      </div>
    </Card>
  );
}

export function ProfileTabsSkeleton() {
  return (
    <Tabs defaultValue="posts" className="pt-14 md:pt-32 pb-16">
      <TabsList className="p-px bg-zinc-300 dark:bg-neutral-800 h-px w-full gap-x-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col mt-8 gap-4">
            <Separator className="!h-px w-16 dark:!bg-neutral-800 bg-zinc-300" />
            <div className="flex items-center gap-x-1">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </TabsList>
    </Tabs>
  );
}
