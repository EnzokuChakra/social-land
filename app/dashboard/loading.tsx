import { PostsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col items-center min-h-screen">
      <div className="flex flex-col items-center flex-grow w-full max-w-7xl gap-10 px-6">
        <div className="flex flex-col items-center flex-grow w-full max-w-4xl gap-10">
          <PostsSkeleton />
        </div>
      </div>
    </div>
  );
} 