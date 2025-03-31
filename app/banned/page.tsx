import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-red-600">Account Banned</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Your account has been banned from using this service.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          If you believe this is a mistake, please contact support.
        </p>
        <div className="pt-4">
          <Button asChild>
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 