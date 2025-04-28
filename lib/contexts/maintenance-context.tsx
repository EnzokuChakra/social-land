"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';

interface MaintenanceState {
  isMaintenance: boolean;
  message: string;
  isLoading: boolean;
  error: string | null;
}

interface MaintenanceContextType extends MaintenanceState {
  checkMaintenanceStatus: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [state, setState] = useState<MaintenanceState>({
    isMaintenance: false,
    message: "We're making some improvements to bring you a better experience. We'll be back shortly!",
    isLoading: true,
    error: null
  });

  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket'],
        timeout: 10000
      });

      socketRef.current.on('connect', () => {
        console.log('[Maintenance] Socket connected');
        setState(prev => ({ ...prev, error: null }));
      });

      socketRef.current.on('disconnect', () => {
        console.log('[Maintenance] Socket disconnected');
      });

      socketRef.current.on('error', (error: any) => {
        console.error('[Maintenance] Socket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      });

      socketRef.current.on('maintenanceStatus', (data: { maintenanceMode: boolean; message: string }) => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            isMaintenance: data.maintenanceMode,
            message: data.message,
            isLoading: false,
            error: null
          }));
          handleMaintenanceRedirect(data.maintenanceMode);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const handleMaintenanceRedirect = useCallback((isMaintenance: boolean) => {
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
      return;
    }

    if (isMaintenance && pathname !== '/maintenance') {
      router.push('/maintenance');
    } else if (!isMaintenance && pathname === '/maintenance') {
      router.push('/dashboard');
    }
  }, [pathname, session, router]);

  const checkMaintenanceStatus = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/admin/settings/maintenance', {
        headers: {
          'x-public-request': 'true',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching maintenance status: ${response.status}`);
      }

      const data = await response.json();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isMaintenance: data.maintenanceMode,
          message: data.message || prev.message,
          isLoading: false,
          error: null
        }));
        handleMaintenanceRedirect(data.maintenanceMode);
      }
    } catch (error) {
      console.error('[Maintenance] Error checking status:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }
  }, [handleMaintenanceRedirect]);

  // Set up periodic checks
  useEffect(() => {
    mountedRef.current = true;

    // Initial check
    checkMaintenanceStatus();

    // Set up interval to check maintenance status periodically
    checkIntervalRef.current = setInterval(checkMaintenanceStatus, 60000); // Check every 60 seconds

    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [checkMaintenanceStatus]);

  const value = {
    ...state,
    checkMaintenanceStatus
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