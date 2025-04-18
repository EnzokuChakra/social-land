"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMaintenance, MaintenanceProvider } from "@/lib/contexts/maintenance-context";
import { useSession } from "next-auth/react";

function MaintenancePageContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { maintenanceMode, message } = useMaintenance();

  // Redirect if maintenance mode is off or user is admin
  useEffect(() => {
    let mounted = true;
    
    if (mounted && (!maintenanceMode || session?.user?.role === 'MASTER_ADMIN')) {
      router.push("/");
    }

    return () => {
      mounted = false;
    };
  }, [maintenanceMode, router, session]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <motion.div 
        className="max-w-2xl mx-auto px-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full /*blur-2xl*/ bg-blue-500/10" />
          <h1 className="relative text-4xl font-bold mb-4">Under Maintenance</h1>
        </div>
        
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
          {message}
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