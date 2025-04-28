"use client";

import { BadgeCheckIcon, Clock } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";

type VerificationStatus = {
  hasRequest: boolean;
  status: string | null;
  isVerified: boolean;
};

export default function VerificationStatusDropdownItem() {
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
        const response = await fetch('/api/verification/status');
        if (!response.ok) {
          throw new Error('Failed to fetch verification status');
        }
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('[VerificationStatusDropdown] Error loading status:', error);
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
        loadStatus();
      });
    }
  }, [socket, loadStatus]);

  // Listen for verification status updates
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    const handleVerificationUpdate = (data: any) => {
      if (data.type === "VERIFICATION_APPROVED") {
        setStatus({
          hasRequest: false,
          status: "APPROVED",
          isVerified: true
        });
      } else if (data.type === "VERIFICATION_REJECTED") {
        setStatus({
          hasRequest: false,
          status: "REJECTED",
          isVerified: false
        });
      } else if (data.type === "VERIFICATION_REQUESTED") {
        setStatus(data.data || {
          hasRequest: true,
          status: "PENDING",
          isVerified: false
        });
      } else if (data.type === "VERIFICATION_STATUS_UPDATE") {
        if (data.data) {
          setStatus(data.data);
        }
      }
    };

    const eventName = `user:${session.user.id}`;
    socket.off(eventName, handleVerificationUpdate);
    socket.on(eventName, handleVerificationUpdate);

    return () => {
      socket.off(eventName, handleVerificationUpdate);
    };
  }, [socket, session?.user?.id]);

  if (!session?.user) return null;

  if (status.isVerified) {
    return (
      <>
        <BadgeCheckIcon className="w-5 h-5 text-green-500" />
        <p className="text-green-500 font-semibold">Verified Account</p>
      </>
    );
  } else if (status.hasRequest && status.status === "PENDING") {
    return (
      <>
        <Clock className="w-5 h-5 text-yellow-500" />
        <p className="text-yellow-500 font-semibold">Pending Verification</p>
      </>
    );
  } else {
    return (
      <>
        <BadgeCheckIcon className="w-5 h-5 text-blue-500" />
        <p className="text-blue-500 font-semibold">Get Verified</p>
      </>
    );
  }
} 