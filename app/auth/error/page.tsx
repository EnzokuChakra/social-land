import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthError({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams?.error;
  const isBanned = error?.includes("banned");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isBanned ? "Account Banned" : "Authentication Error"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isBanned
              ? "Your account has been banned for violating our community guidelines."
              : "There was an error signing in to your account."}
          </p>
        </div>

        <div className="grid gap-6">
          <div className="flex flex-col gap-2">
            <Button variant="secondary" asChild>
              <Link href="/">Return to Home</Link>
            </Button>
            {isBanned && (
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:underline text-center"
              >
                Contact Support
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 