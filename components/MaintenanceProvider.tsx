'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useMaintenanceMode } from '@/lib/hooks/use-maintenance-mode';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface MaintenanceProviderProps {
  children: ReactNode;
}

export default function MaintenanceProvider({ children }: MaintenanceProviderProps) {
  const { isMaintenance, message, isLoading } = useMaintenanceMode();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showMaintenance, setShowMaintenance] = useState(false);

  // Don't show maintenance page for:
  // 1. MASTER_ADMIN users
  // 2. Auth pages
  // 3. API routes
  // 4. Maintenance page itself
  useEffect(() => {
    if (
      isMaintenance && 
      session?.user?.role !== 'MASTER_ADMIN' &&
      !pathname.startsWith('/auth') &&
      !pathname.startsWith('/api') &&
      pathname !== '/maintenance'
    ) {
      setShowMaintenance(true);
    } else {
      setShowMaintenance(false);
    }
  }, [isMaintenance, pathname, session]);

  // During initial load, show the children while checking maintenance status
  if (isLoading) {
    return <>{children}</>;
  }

  if (showMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="max-w-md w-full p-6 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Maintenance Mode
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 