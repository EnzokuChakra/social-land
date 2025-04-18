"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import io from 'socket.io-client';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface MaintenanceContextType {
  maintenanceMode: boolean;
  message: string;
  error: string | null;
  isUnauthorized: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [message, setMessage] = useState("We're making some improvements to bring you a better experience. We'll be back shortly!");
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const socketRef = useRef<any>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkMaintenanceAndRedirect = useCallback((isMaintenance: boolean) => {
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

    if (isMaintenance) {
      router.push('/maintenance');
    } else if (pathname === '/maintenance') {
      // If maintenance is disabled and we're on the maintenance page,
      // redirect to the user's profile page after a short delay
      redirectTimeoutRef.current = setTimeout(() => {
        const username = session?.user?.username;
        if (username) {
          router.push(`/dashboard/${username}`);
        } else {
          router.push('/dashboard');
        }
      }, 1000);
    }
  }, [pathname, session, router]);

  // Set up WebSocket connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket']
      });
    }

    const socket = socketRef.current;

    socket.on("maintenanceStatus", (data: { maintenanceMode: boolean; message: string }) => {
      setMaintenanceMode(data.maintenanceMode);
      setMessage(data.message);
      checkMaintenanceAndRedirect(data.maintenanceMode);
    });

    // Fetch initial maintenance status from API
    fetch('/api/admin/settings/maintenance', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          setIsUnauthorized(true);
        }
        throw new Error(`Error fetching maintenance status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      setMaintenanceMode(data.maintenanceMode);
      setMessage(data.message || "We're making some improvements to bring you a better experience. We'll be back shortly!");
      checkMaintenanceAndRedirect(data.maintenanceMode);
    })
    .catch(error => {
      console.error('Error fetching maintenance status:', error);
      setError(error.message);
    });

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [checkMaintenanceAndRedirect]);

  const value = {
    maintenanceMode,
    message,
    error,
    isUnauthorized
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