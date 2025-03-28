import { CustomLoader } from "@/components/ui/custom-loader";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black/80">
      <CustomLoader />
    </div>
  );
} 