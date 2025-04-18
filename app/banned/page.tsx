import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function BannedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Account Banned</h1>
          <p className="text-sm text-muted-foreground">
            This account has been banned for violating our community guidelines.
          </p>
        </div>

        <div className="grid gap-6">
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Return to Home
            </Button>
            <Link href="/contact" className="text-sm text-muted-foreground hover:underline text-center">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 