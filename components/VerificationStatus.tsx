"use client";

import { BadgeCheckIcon, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";

type VerificationStatus = {
  hasRequest: boolean;
  status: string | null;
  isVerified: boolean;
};

export default function VerificationStatus() {
  const [status, setStatus] = useState<VerificationStatus>({
    hasRequest: false,
    status: null,
    isVerified: false
  });
  const { data: session } = useSession();
  const socket = getSocket();

  const loadStatus = useCallback(async () => {
    if (session?.user?.id) {
      try {
        console.log("[VerificationStatus] Fetching status...");
        const response = await fetch('/api/verification/status');
        if (!response.ok) {
          throw new Error('Failed to fetch verification status');
        }
        const data = await response.json();
        console.log("[VerificationStatus] Status received:", data);
        setStatus(data);
      } catch (error) {
        console.error('[VerificationStatus] Error loading status:', error);
      }
    }
  }, [session?.user?.id]);

  // Initial status load
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Socket reconnection handler
  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        console.log("[VerificationStatus] Socket reconnected, reloading status");
        loadStatus();
      });
    }
  }, [socket, loadStatus]);

  // Listen for verification status updates
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    console.log("[VerificationStatus] Setting up socket listeners...");

    const handleVerificationUpdate = (data: any) => {
      console.log("[VerificationStatus] Socket event received:", data);
      
      if (data.type === "VERIFICATION_APPROVED") {
        console.log("[VerificationStatus] Updating to approved state");
        setStatus({
          hasRequest: false,
          status: "APPROVED",
          isVerified: true
        });
      } else if (data.type === "VERIFICATION_REJECTED") {
        console.log("[VerificationStatus] Updating to rejected state");
        setStatus({
          hasRequest: false,
          status: "REJECTED",
          isVerified: false
        });
      } else if (data.type === "VERIFICATION_REQUESTED") {
        console.log("[VerificationStatus] Updating to pending state");
        setStatus(data.data || {
          hasRequest: true,
          status: "PENDING",
          isVerified: false
        });
      }
    };

    const eventName = `user:${session.user.id}`;
    socket.off(eventName, handleVerificationUpdate); // Remove any existing listeners
    socket.on(eventName, handleVerificationUpdate); // Add new listener
    console.log("[VerificationStatus] Socket listener attached for user:", session.user.id);

    return () => {
      socket.off(eventName, handleVerificationUpdate);
      console.log("[VerificationStatus] Socket listener removed for cleanup");
    };
  }, [socket, session?.user?.id]);

  useEffect(() => {
    console.log("[VerificationStatus] Current status:", status);
  }, [status]);

  if (!session?.user) return null;

  return status.isVerified ? (
    <div className="flex items-center gap-x-2">
      <BadgeCheckIcon className="w-5 h-5 text-green-500" />
      <span className="text-sm font-medium text-green-500">Verified Account</span>
    </div>
  ) : status.hasRequest && status.status === "PENDING" ? (
    <div className="flex items-center gap-x-2">
      <Clock className="w-5 h-5 text-yellow-500" />
      <span className="text-sm font-medium text-yellow-500">Pending Verification</span>
    </div>
  ) : (
    <Link 
      href="/dashboard/verify" 
      className="flex items-center gap-x-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
    >
      <BadgeCheckIcon className="w-5 h-5" />
      Get Verified
    </Link>
  );
} 