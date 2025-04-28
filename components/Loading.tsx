import { CustomLoader } from "@/components/ui/custom-loader";

export default function Loading() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-white/80 dark:bg-black/80">
      <CustomLoader />
    </div>
  );
} 