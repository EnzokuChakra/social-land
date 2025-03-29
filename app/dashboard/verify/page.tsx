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
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/lib/hooks/use-socket";

type VerificationStatus = {
  hasRequest: boolean;
  status: string | null;
};

export default function VerifyPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { isCollapsed } = useNavbar();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    hasRequest: false,
    status: null
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    // Only redirect if we're certain there's no session
    if (sessionStatus === "unauthenticated") {
      redirect("/login");
    }

    if (sessionStatus === "authenticated") {
      checkVerificationStatus();
    }

    // Listen for verification status updates
    if (socket && session?.user) {
      socket.on(`user:${session.user.id}`, (data: any) => {
        if (data.type === "VERIFICATION_APPROVED") {
          // Update the session to reflect the new verified status
          if (session.user) {
            session.user.verified = true;
          }
          // Show success message
          toast.success(data.data.message);
          // Update local state to show verified state
          setVerificationStatus({
            hasRequest: true,
            status: "APPROVED"
          });
        }
      });

      return () => {
        socket.off(`user:${session.user.id}`);
      };
    }
  }, [session, sessionStatus, socket]);

  async function checkVerificationStatus() {
    try {
      const response = await fetch("/api/verification/status", {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      setVerificationStatus(data);
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificationRequest() {
    try {
      setIsSubmitting(true);
      setShowTransition(true);

      const response = await fetch("/api/verification/request", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit request");
      }

      // Add a small delay for the animation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update local state immediately
      setVerificationStatus({
        hasRequest: true,
        status: "PENDING"
      });
      
      toast.success("Verification request submitted successfully");
    } catch (error) {
      console.error("Error submitting verification request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit verification request");
    } finally {
      setIsSubmitting(false);
      setShowTransition(false);
    }
  }

  const mainContent = (
    <div className="container max-w-4xl py-4 md:py-10 pb-24 md:pb-4">
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : session?.user?.verified ? (
        // Verified user view
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-6 md:space-y-8 text-center mb-6 md:mb-10"
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-green-500/20 blur-lg"></div>
            <BadgeCheckIcon className="h-20 w-20 md:h-24 md:w-24 text-green-500 relative" />
          </div>
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-green-500">
              Congratulations! You are verified
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl px-4">
              Your account has been verified by Social Land. The verified badge appears next to your name, 
              indicating that Social Land has confirmed that the account meets our verification requirements.
            </p>
            <div className="flex items-center justify-center gap-2 text-green-500">
              <SparklesIcon className="h-5 w-5" />
              <p className="text-sm font-medium">Enjoying exclusive verified features</p>
              <SparklesIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full mt-6 md:mt-10">
            <Card className="bg-white dark:bg-black">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BadgeCheckIcon className="h-5 w-5 text-green-500" />
                  Verified Badge
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Your green checkmark is now visible to everyone
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-black">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SparklesIcon className="h-5 w-5 text-green-500" />
                  Priority Support
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Get faster responses from our support team
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-black">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SparklesIcon className="h-5 w-5 text-green-500" />
                  Exclusive Features
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Access to special features and early updates
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : verificationStatus.hasRequest ? (
        // Pending verification view
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center justify-center space-y-6 md:space-y-8 text-center mb-6 md:mb-10"
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-yellow-500/20 blur-lg"></div>
            <Clock className="h-20 w-20 md:h-24 md:w-24 text-yellow-500 relative" />
          </div>
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold text-yellow-500">
              Verification Request Pending
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl px-4">
              Your verification request is currently being reviewed by our team. This process typically takes 1-3 business days.
              We&apos;ll notify you once a decision has been made.
            </p>
          </div>
          <Card className="bg-white dark:bg-black w-full max-w-2xl">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-xl md:text-2xl">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6 pt-0">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-yellow-500/10 p-3 shrink-0">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-base md:text-lg">Review Process</h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Our team will carefully review your account to ensure it meets our verification requirements.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-yellow-500/10 p-3 shrink-0">
                  <BadgeCheckIcon className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-base md:text-lg">Notification</h3>
                  <p className="text-muted-foreground text-sm md:text-base">
                    You&apos;ll receive a notification about the status of your verification request.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        // Initial verification request view
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-6 md:space-y-8 text-center mb-6 md:mb-10"
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-blue-500/20 blur-lg"></div>
            <BadgeCheckIcon className="h-20 w-20 md:h-24 md:w-24 text-blue-500 relative" />
          </div>
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-blue-500">
              Get Verified
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl px-4">
              Apply for a verified badge to show your followers that you&apos;re the real deal.
              This badge helps distinguish authentic accounts from fan accounts or impersonators.
            </p>
          </div>

          <Card className="bg-white dark:bg-black border-0 shadow-md w-full">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardTitle className="text-xl md:text-2xl text-left">Eligibility Requirements</CardTitle>
              <CardDescription className="text-sm md:text-base text-left">
                To be eligible for verification, your account must meet the following criteria:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-0">
              <div className="grid gap-4 md:gap-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-blue-500/10 p-2 md:p-3 shrink-0">
                    <BadgeCheckIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base md:text-lg mb-1">Authentic</h3>
                    <p className="text-muted-foreground text-sm md:text-base">
                      Your account must represent a real person, registered business, or entity.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-blue-500/10 p-2 md:p-3 shrink-0">
                    <BadgeCheckIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base md:text-lg mb-1">Unique</h3>
                    <p className="text-muted-foreground text-sm md:text-base">
                      Your account must be the unique presence of the person or business it represents.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-blue-500/10 p-2 md:p-3 shrink-0">
                    <BadgeCheckIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-base md:text-lg mb-1">Notable</h3>
                    <p className="text-muted-foreground text-sm md:text-base">
                      Your account must be in the public interest, news, entertainment, or another designated field.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <motion.div
            animate={showTransition ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="w-full px-4 md:px-0"
          >
            <Button
              onClick={handleVerificationRequest}
              disabled={isSubmitting}
              className={cn(
                "w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-full relative overflow-hidden",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              <AnimatePresence>
                {isSubmitting ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex items-center justify-center gap-2"
                  >
                    Apply for Verification
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className={cn(
      "flex-1 space-y-4 p-4 md:p-8 pt-6 min-h-screen pb-32",
      isCollapsed && !isMobile ? "ml-14" : "ml-0 md:ml-64"
    )}>
      <div className="h-full overflow-y-auto">
        {mainContent}
      </div>
    </div>
  );
} 