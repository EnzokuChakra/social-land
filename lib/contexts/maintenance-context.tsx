"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import io from 'socket.io-client';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface MaintenanceContextType {
  maintenanceMode: boolean;
  message: string;
  isLoading: boolean;
  error: string | null;
  isUnauthorized: boolean;
  refreshMaintenanceStatus: () => Promise<void>;
}

interface MaintenanceData {
  maintenanceMode: boolean;
  message: string;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [message, setMessage] = useState("We're making some improvements to bring you a better experience. We'll be back shortly!");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const socketRef = useRef<any>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkMaintenanceAndRedirect = useCallback((isMaintenance: boolean) => {
    console.log('[MAINTENANCE] Checking maintenance and redirect:', {
      isMaintenance,
      currentPath: pathname,
      userRole: session?.user?.role,
      isMaintenancePage: pathname === '/maintenance',
      isAuthPage: pathname.startsWith('/auth'),
      isApiRoute: pathname.startsWith('/api')
    });

    // Clear any existing redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Don't redirect if:
    // 1. We're already on the maintenance page
    // 2. User is a MASTER_ADMIN
    // 3. We're on the auth pages
    // 4. We're on an API route
    if (
      pathname === '/maintenance' ||
      session?.user?.role === 'MASTER_ADMIN' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api')
    ) {
      console.log('[MAINTENANCE] Skipping redirect due to:', {
        reason: pathname === '/maintenance' ? 'already on maintenance page' :
                session?.user?.role === 'MASTER_ADMIN' ? 'MASTER_ADMIN user' :
                pathname.startsWith('/auth') ? 'auth page' : 'API route'
      });
      return;
    }

    if (isMaintenance) {
      console.log('[MAINTENANCE] Redirecting to maintenance page');
      router.push('/maintenance');
    } else if (pathname === '/maintenance') {
      // If maintenance is disabled and we're on the maintenance page,
      // redirect to the user's profile page after a short delay
      console.log('[MAINTENANCE] Maintenance disabled, scheduling redirect to profile');
      redirectTimeoutRef.current = setTimeout(() => {
        const username = session?.user?.username;
        if (username) {
          console.log('[MAINTENANCE] Executing redirect to profile:', username);
          router.push(`/dashboard/${username}`);
        } else {
          console.log('[MAINTENANCE] No username found, redirecting to dashboard');
          router.push('/dashboard');
        }
      }, 1000); // 1 second delay to ensure state is updated
    }
  }, [pathname, session, router]);

  const refreshMaintenanceStatus = useCallback(async () => {
    try {
      console.log('[MAINTENANCE] Refreshing maintenance status');
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/settings/maintenance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (response.status === 401) {
        console.log('[MAINTENANCE] Unauthorized access to maintenance status');
        setIsUnauthorized(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance status');
      }

      const data = await response.json();
      console.log('[MAINTENANCE] Received maintenance status:', data);
      
      setMaintenanceMode(data.maintenanceMode);
      setMessage(data.message);

      checkMaintenanceAndRedirect(data.maintenanceMode);
    } catch (err) {
      console.error('[MAINTENANCE] Error fetching maintenance status:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [checkMaintenanceAndRedirect]);

  // Set up WebSocket connection
  useEffect(() => {
    console.log('[MAINTENANCE] Setting up WebSocket connection');
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket']
      });
    }

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log('[MAINTENANCE] WebSocket connected');
    });

    socket.on("disconnect", () => {
      console.log('[MAINTENANCE] WebSocket disconnected');
    });

    socket.on("maintenanceModeUpdate", (data: MaintenanceData) => {
      console.log('[MAINTENANCE] Received maintenance mode update:', data);
      setMaintenanceMode(data.maintenanceMode);
      setMessage(data.message);

      checkMaintenanceAndRedirect(data.maintenanceMode);
    });

    return () => {
      console.log('[MAINTENANCE] Cleaning up WebSocket connection');
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [checkMaintenanceAndRedirect]);

  // Check maintenance status on mount and when pathname changes
  useEffect(() => {
    console.log('[MAINTENANCE] Pathname changed, checking maintenance status');
    refreshMaintenanceStatus();
  }, [refreshMaintenanceStatus, pathname]);

  const value = {
    maintenanceMode,
    message,
    isLoading,
    error,
    isUnauthorized,
    refreshMaintenanceStatus
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
} 