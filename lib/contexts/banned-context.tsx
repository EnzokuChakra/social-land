"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';

interface BannedState {
  isBanned: boolean;
  message: string;
  isLoading: boolean;
  error: string | null;
}

interface BannedContextType extends BannedState {
  checkBanStatus: () => Promise<void>;
}

const BannedContext = createContext<BannedContextType | undefined>(undefined);

export function BannedProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [state, setState] = useState<BannedState>({
    isBanned: false,
    message: "Your account has been banned. Please contact support for more information.",
    isLoading: true,
    error: null
  });

  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!socketRef.current && session?.user) {
      socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket'],
        timeout: 10000
      });

      socketRef.current.on('connect', () => {
        console.log('[Banned] Socket connected');
        setState(prev => ({ ...prev, error: null }));
      });

      socketRef.current.on('disconnect', () => {
        console.log('[Banned] Socket disconnected');
      });

      socketRef.current.on('error', (error: any) => {
        console.error('[Banned] Socket error:', error);
        setState(prev => ({ ...prev, error: 'Connection error' }));
      });

      socketRef.current.on('banStatus', (data: { isBanned: boolean; message: string }) => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            isBanned: data.isBanned,
            message: data.message,
            isLoading: false,
            error: null
          }));
          handleBanRedirect(data.isBanned);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session]);

  const handleBanRedirect = useCallback((isBanned: boolean) => {
    // Don't redirect if:
    // 1. We're already on the banned page
    // 2. User is a MASTER_ADMIN
    // 3. We're on the auth pages
    // 4. We're on an API route
    if (
      pathname === '/banned' ||
      session?.user?.role === 'MASTER_ADMIN' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api')
    ) {
      return;
    }

    if (isBanned && pathname !== '/banned') {
      router.push('/banned');
    } else if (!isBanned && pathname === '/banned') {
      router.push('/dashboard');
    }
  }, [pathname, session, router]);

  const checkBanStatus = useCallback(async () => {
    if (!mountedRef.current || !session?.user) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/users/ban/status', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error checking ban status: ${response.status}`);
      }

      const data = await response.json();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isBanned: data.isBanned,
          message: data.message || prev.message,
          isLoading: false,
          error: null
        }));
        handleBanRedirect(data.isBanned);
      }
    } catch (error) {
      console.error('[Banned] Error checking status:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }
  }, [handleBanRedirect, session]);

  // Set up periodic checks
  useEffect(() => {
    mountedRef.current = true;

    // Initial check
    if (session?.user) {
      checkBanStatus();
    }

    // Set up interval to check ban status periodically
    checkIntervalRef.current = setInterval(checkBanStatus, 60000); // Check every 60 seconds

    return () => {
      mountedRef.current = false;
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkBanStatus, session]);

  const value = {
    ...state,
    checkBanStatus
  };

  return (
    <BannedContext.Provider value={value}>
      {children}
    </BannedContext.Provider>
  );
}

export function useBanned() {
  const context = useContext(BannedContext);
  if (context === undefined) {
    throw new Error('useBanned must be used within a BannedProvider');
  }
  return context;
} 