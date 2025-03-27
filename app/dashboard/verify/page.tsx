"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheckIcon, SparklesIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { toast } from "sonner";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

type VerificationStatus = {
  hasRequest: boolean;
  status: string | null;
};

export default function VerifyPage() {
  const { data: session } = useSession();
  const { isCollapsed } = useNavbar();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [status, setStatus] = useState<VerificationStatus>({
    hasRequest: false,
    status: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      redirect("/login");
    }

    checkVerificationStatus();
  }, [session]);

  async function checkVerificationStatus() {
    try {
      const response = await fetch("/api/verification/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificationRequest() {
    try {
      const response = await fetch("/api/verification/request", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to submit request");

      toast.success("Verification request submitted successfully");
      checkVerificationStatus();
    } catch (error) {
      console.error("Error submitting verification request:", error);
      toast.error("Failed to submit verification request");
    }
  }

  const mainContent = (
    <div className="container max-w-4xl py-10">
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : session?.user?.verified ? (
        // Verified user view
        <div className="flex flex-col items-center justify-center space-y-8 text-center mb-10">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-green-500/20 blur-lg"></div>
            <BadgeCheckIcon className="h-24 w-24 text-green-500 relative" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-green-500">
              Congratulations! You are verified
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Your account has been verified by Social Land. The verified badge appears next to your name, 
              indicating that Social Land has confirmed that the account meets our verification requirements.
            </p>
            <div className="flex items-center justify-center gap-2 text-green-500">
              <SparklesIcon className="h-5 w-5" />
              <p className="text-sm font-medium">Enjoying exclusive verified features</p>
              <SparklesIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
            <Card className="bg-white dark:bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheckIcon className="h-5 w-5 text-green-500" />
                  Verified Badge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Your green checkmark is now visible to everyone
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-green-500" />
                  Priority Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Get faster responses from our support team
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-green-500" />
                    <span>Exclusive</span>
                  </div>
                  <span>Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Access to special features and early updates
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : status.hasRequest ? (
        // Pending verification view
        <div className="flex flex-col items-center justify-center space-y-8 text-center mb-10">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-yellow-500/20 blur-lg"></div>
            <Clock className="h-24 w-24 text-yellow-500 relative" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-yellow-500">
              Verification Request Pending
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Your verification request is currently being reviewed by our team. This process typically takes 1-3 business days.
              We&apos;ll notify you once a decision has been made.
            </p>
          </div>
          <Card className="bg-white dark:bg-black w-full max-w-2xl">
            <CardHeader>
              <CardTitle>What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-yellow-500/10 p-3">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Review Process</h3>
                  <p className="text-muted-foreground">
                    Our team will carefully review your account to ensure it meets our verification requirements.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-yellow-500/10 p-3">
                  <BadgeCheckIcon className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Notification</h3>
                  <p className="text-muted-foreground">
                    You&apos;ll receive a notification about the status of your verification request.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Non-verified user view
        <div className="flex flex-col items-center justify-center space-y-8 text-center mb-10">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-blue-500/20 blur-lg"></div>
            <BadgeCheckIcon className="h-24 w-24 text-blue-500 relative" />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Get Verified on Social Land</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A verified badge is a check that appears next to an account&apos;s name to
              indicate that Social Land has confirmed that the account meets our
              verification requirements.
            </p>
          </div>

          <div className="grid gap-6 w-full">
            <Card className="bg-white dark:bg-black border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-left">Eligibility Requirements</CardTitle>
                <CardDescription className="text-base text-left">
                  To be eligible for verification, your account must meet the following criteria:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="grid gap-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-500/10 p-3 shrink-0">
                      <BadgeCheckIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg mb-1">Authentic</h3>
                      <p className="text-muted-foreground text-base">
                        Your account must represent a real person, registered business, or entity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-500/10 p-3 shrink-0">
                      <BadgeCheckIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg mb-1">Unique</h3>
                      <p className="text-muted-foreground text-base">
                        Your account must be the unique presence of the person or business it represents.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-500/10 p-3 shrink-0">
                      <BadgeCheckIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg mb-1">Experience</h3>
                      <p className="text-muted-foreground text-base">
                        You must have at least 5,000 months spent in the city.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-500/10 p-3 shrink-0">
                      <BadgeCheckIcon className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg mb-1">Notable</h3>
                      <p className="text-muted-foreground text-base">
                        Your account must represent a well-known, highly searched individual, with a minimum of 1 year of content creation experience.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center gap-4 mt-6">
              <Button 
                size="lg" 
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 h-12 text-base"
                onClick={handleVerificationRequest}
              >
                Apply now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-950 font-semibold px-8 h-12 text-base"
                onClick={() => toast.info("Coming soon!")}
              >
                Buy with OG Coins
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "min-h-screen transition-[margin] duration-300 ease-in-out pt-10",
        isMobile ? "ml-0" : isCollapsed ? "ml-[88px]" : "ml-[245px]"
      )}
    >
      {mainContent}
    </div>
  );
} 