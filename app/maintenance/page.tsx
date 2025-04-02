"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMaintenance, MaintenanceProvider } from "@/lib/contexts/maintenance-context";
import { useSession } from "next-auth/react";

interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
}

function MaintenancePageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { maintenanceMode, estimatedTime, message, isLoading } = useMaintenance();
  const [countdown, setCountdown] = useState<Countdown>({ hours: 0, minutes: 0, seconds: 0 });
  const countdownRef = useRef<Countdown>({ hours: 0, minutes: 0, seconds: 0 });
  const initializedRef = useRef(false);

  // Initialize countdown from estimated time
  useEffect(() => {
    if (!initializedRef.current && estimatedTime) {
      const [hours, minutes] = estimatedTime.split(':').map(Number);
      const newCountdown = { hours, minutes, seconds: 0 };
      setCountdown(newCountdown);
      countdownRef.current = newCountdown;
      initializedRef.current = true;
    }
  }, [estimatedTime]);

  // Update countdown handler
  const updateCountdown = useCallback(() => {
    const current = countdownRef.current;
    
    if (current.hours === 0 && current.minutes === 0 && current.seconds === 0) {
      return false;
    }

    let newSeconds = current.seconds - 1;
    let newMinutes = current.minutes;
    let newHours = current.hours;

    if (newSeconds < 0) {
      newSeconds = 59;
      newMinutes--;
    }

    if (newMinutes < 0) {
      newMinutes = 59;
      newHours--;
    }

    const newCountdown = { hours: newHours, minutes: newMinutes, seconds: newSeconds };
    countdownRef.current = newCountdown;
    setCountdown(newCountdown);
    return true;
  }, []);

  // Handle countdown
  useEffect(() => {
    if (!initializedRef.current) return;

    const interval = setInterval(() => {
      const shouldContinue = updateCountdown();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateCountdown, initializedRef.current]);

  // Redirect if maintenance mode is off or user is admin
  useEffect(() => {
    let mounted = true;
    
    if (mounted && !isLoading && (!maintenanceMode || session?.user?.role === 'MASTER_ADMIN')) {
      router.push("/");
    }

    return () => {
      mounted = false;
    };
  }, [maintenanceMode, isLoading, router, session]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20" />
            <div className="relative animate-spin h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 animate-pulse">
            Checking maintenance status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <motion.div 
        className="max-w-2xl mx-auto px-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full blur-2xl bg-blue-500/10" />
          <h1 className="relative text-4xl font-bold mb-4">Under Maintenance</h1>
        </div>
        
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
          {message}
        </p>
        
        <div className="flex justify-center gap-4 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-lg">
              {countdown.hours.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Hours</div>
          </div>
          <div className="text-3xl font-bold self-start">:</div>
          <div className="text-center">
            <div className="text-3xl font-bold bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-lg">
              {countdown.minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Minutes</div>
          </div>
          <div className="text-3xl font-bold self-start">:</div>
          <div className="text-center">
            <div className="text-3xl font-bold bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-lg">
              {countdown.seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Seconds</div>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          We appreciate your patience while we improve our services.
        </p>
      </motion.div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <MaintenanceProvider>
      <MaintenancePageContent />
    </MaintenanceProvider>
  );
} 