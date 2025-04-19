"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheckIcon, SparklesIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useNavbar } from "@/lib/hooks/use-navbar";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { CustomLoader } from "@/components/ui/custom-loader";

type VerificationStatus = {
  hasRequest: boolean;
  status: string | null;
  isVerified: boolean;
};

export default function VerifyPage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const { isCollapsed } = useNavbar();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus>({
    hasRequest: false,
    status: null,
    isVerified: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const socket = getSocket();
  const [isMounted, setIsMounted] = useState(false);
  const [hasFetchedStatus, setHasFetchedStatus] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [socketInitialized, setSocketInitialized] = useState(false);

  // Handle initial mount and session
  useEffect(() => {
    setIsMounted(true);
    
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }

    return () => {
      setIsMounted(false);
      setSocketInitialized(false);
    };
  }, [sessionStatus, router]);

  // Handle verification status fetch
  useEffect(() => {
    if (!isMounted || sessionStatus !== "authenticated" || hasFetchedStatus) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/verification/status");
        const data = await response.json();
        setStatus(data);
        setHasFetchedStatus(true);
      } catch (error) {
        console.error("[VerifyPage] Error checking status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [isMounted, sessionStatus, hasFetchedStatus]);

  // Handle socket events
  useEffect(() => {
    if (!isMounted || !socket || !session?.user || socketInitialized) return;

    const handleVerificationUpdate = async (data: any) => {
      if (data.type === "VERIFICATION_APPROVED") {
        try {
          await updateSession({
            ...session,
            user: {
              ...session.user,
              verified: true
            }
          });
          
          setStatus(prev => ({
            ...prev,
            status: "APPROVED",
            isVerified: true
          }));

          toast.success(data.data.message);
        } catch (error) {
          console.error("[VerifyPage] Error updating session:", error);
        }
      } else if (data.type === "VERIFICATION_REJECTED") {
        setStatus({
          hasRequest: false,
          status: "REJECTED",
          isVerified: false
        });
        toast.error(data.data.message || "Your verification request has been rejected.");
      } else if (data.type === "VERIFICATION_REQUESTED") {
        setStatus({
          hasRequest: true,
          status: "PENDING",
          isVerified: false
        });
        toast.success(data.data.message || "Verification request submitted.");
      } else if (data.type === "VERIFICATION_STATUS_UPDATE") {
        if (data.data) {
          setStatus(data.data);
        }
      }
    };

    if (!socket.hasListeners(`user:${session.user.id}`)) {
      socket.on(`user:${session.user.id}`, handleVerificationUpdate);
      setSocketInitialized(true);
    }

    return () => {
      if (socket.hasListeners(`user:${session.user.id}`)) {
        socket.off(`user:${session.user.id}`, handleVerificationUpdate);
      }
    };
  }, [isMounted, socket, session, updateSession, socketInitialized]);

  // Handle animation completion
  useEffect(() => {
    if (showTransition) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [showTransition]);

  async function handleVerificationRequest() {
    try {
      setIsSubmitting(true);
      setShowTransition(true);
      setAnimationComplete(false);

      const response = await fetch("/api/verification/request", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit request");
      }

      const data = await response.json();

      setStatus({
        hasRequest: true,
        status: "PENDING",
        isVerified: false
      });

      if (socket && session?.user?.id) {
        socket.emit(`user:${session.user.id}`, {
          type: "VERIFICATION_REQUESTED",
          data: {
            message: "Verification request submitted"
          }
        });
      }
      
      toast.success(data.message || "Verification request submitted successfully");
    } catch (error) {
      console.error("[VerifyPage] Error submitting request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit verification request");
    } finally {
      setIsSubmitting(false);
      setShowTransition(false);
    }
  }

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex-1 pt-4 md:pt-6 flex items-center justify-center">
        <CustomLoader size="default" />
      </div>
    );
  }

  return (
    <main className={cn(
      "flex-1 pt-4 md:pt-6",
      isCollapsed && !isMobile ? "pl-4" : isMobile ? "pl-0" : "pl-8"
    )}>
      <div className="container max-w-4xl mx-auto">
        <div className="container max-w-4xl py-6 px-4 md:py-10 md:px-8">
          {status.isVerified ? (
            // Verified user view
            <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 text-center mb-6 md:mb-10">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-green-500/20 /*blur-lg*/"></div>
                <BadgeCheckIcon className="h-16 w-16 md:h-24 md:w-24 text-green-500 relative" />
              </div>
              <div className="space-y-3 md:space-y-4">
                <h1 className="text-2xl md:text-4xl font-bold text-green-500">
                  Congratulations! You are verified
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
                  Your account has been verified by Social Land. The verified badge appears next to your name, 
                  indicating that Social Land has confirmed that the account meets our verification requirements.
                </p>
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <SparklesIcon className="h-4 w-4 md:h-5 md:w-5" />
                  <p className="text-sm font-medium">Enjoying exclusive verified features</p>
                  <SparklesIcon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full mt-6 md:mt-10">
                <Card className="bg-white dark:bg-black">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                      <BadgeCheckIcon className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                      Verified Badge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Your green checkmark is now visible to everyone
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-black">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                      Priority Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Get faster responses from our support team
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-black">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                        <span>Exclusive</span>
                      </div>
                      <span>Features</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Access to special features and early updates
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : status.hasRequest && status.status === "PENDING" ? (
            // Pending verification view
            <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 text-center mb-6 md:mb-10">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-yellow-500/20 /*blur-lg*/"></div>
                <Clock className="h-16 w-16 md:h-24 md:w-24 text-yellow-500 relative" />
              </div>
              <div className="space-y-3 md:space-y-4">
                <h1 className="text-2xl md:text-3xl font-bold text-yellow-500">
                  Verification Request Pending
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
                  Your verification request is currently being reviewed by our team. This process typically takes 1-3 business days.
                  We&apos;ll notify you once a decision has been made.
                </p>
              </div>
              <Card className="bg-white dark:bg-black w-full max-w-2xl">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-lg md:text-xl">What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4 md:p-6">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="rounded-full bg-yellow-500/10 p-2 md:p-3">
                      <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-base md:text-lg">Review Process</h3>
                      <p className="text-muted-foreground text-sm md:text-base">
                        Our team will carefully review your account to ensure it meets our verification requirements.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="rounded-full bg-yellow-500/10 p-2 md:p-3">
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
            </div>
          ) : (
            // Initial verification request view
            <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 text-center mb-6 md:mb-10">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-blue-500/20 /*blur-lg*/"></div>
                <BadgeCheckIcon className="h-16 w-16 md:h-24 md:w-24 text-blue-500 relative" />
              </div>
              <div className="space-y-3 md:space-y-4">
                <h1 className="text-2xl md:text-4xl font-bold text-blue-500">
                  Get Verified
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
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
                <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 pt-4">
                  <div className="grid gap-4 md:gap-6">
                    <div className="flex items-start gap-3 md:gap-4">
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
                    <div className="flex items-start gap-3 md:gap-4">
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
                    <div className="flex items-start gap-3 md:gap-4">
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

              <div className="w-full md:w-auto">
                <Button
                  onClick={handleVerificationRequest}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 md:px-8 py-4 md:py-6 text-base md:text-lg font-semibold rounded-full relative overflow-hidden",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
                      Submitting...
                    </div>
                  ) : (
                    "Apply for Verification"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 