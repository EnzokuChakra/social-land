import { CustomLoader } from "@/components/ui/custom-loader";

export default function ProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-[72px] md:pb-0 bg-white dark:bg-black">
        <div className="flex items-center justify-center min-h-[calc(100vh-72px)] md:min-h-screen -mt-14 md:mt-0">
          <CustomLoader size="lg" noPadding />
        </div>
      </main>
    </div>
  );
} 