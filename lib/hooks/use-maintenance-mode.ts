import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface MaintenanceState {
  isMaintenance: boolean;
  message: string;
  isLoading: boolean;
  error: string | null;
}

export function useMaintenanceMode() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [state, setState] = useState<MaintenanceState>({
    isMaintenance: false,
    message: "We're making some improvements to bring you a better experience. We'll be back shortly!",
    isLoading: false,
    error: null
  });
  const socketRef = useRef<any>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

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

    socket.on("connect", () => {
      if (!isInitialMount.current) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    socket.on("disconnect", () => {
      if (!isInitialMount.current) {
        setState(prev => ({ ...prev, isLoading: true }));
      }
    });

    socket.on("maintenanceStatus", (data: { maintenanceMode: boolean; message: string }) => {
      setState(prev => ({
        ...prev,
        isMaintenance: data.maintenanceMode,
        message: data.message,
        isLoading: false
      }));

      if (
        pathname !== '/maintenance' &&
        session?.user?.role !== 'MASTER_ADMIN' &&
        !pathname.startsWith('/auth') &&
        !pathname.startsWith('/api') &&
        data.maintenanceMode
      ) {
        router.push('/maintenance');
      } else if (
        pathname === '/maintenance' &&
        !data.maintenanceMode
      ) {
        redirectTimeoutRef.current = setTimeout(() => {
          const username = session?.user?.username;
          if (username) {
            router.push(`/dashboard/${username}`);
          } else {
            router.push('/dashboard');
          }
        }, 1000);
      }
    });

    isInitialMount.current = false;

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [pathname, session, router]);

  return state;
} 