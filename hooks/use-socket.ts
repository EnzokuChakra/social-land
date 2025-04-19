"use client";

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

let globalSocket: Socket | null = null;
let lastSessionState: { userId?: string; userRole?: string } | null = null;

export const useSocket = () => {
  const { data: session } = useSession();

  useEffect(() => {
    // Update last session state whenever session changes
    if (session?.user) {
      lastSessionState = {
        userId: session.user.id,
        userRole: session.user.role
      };
    }

    if (!globalSocket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002';
      globalSocket = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: lastSessionState ? { token: lastSessionState.userId } : undefined
      });

      globalSocket.on('connect', () => {
        console.log("[Socket] Connected, session state:", {
          hasSession: !!session,
          userId: session?.user?.id,
          userRole: session?.user?.role,
          lastSessionState
        });
        
        // Use lastSessionState if current session is not available
        const authToken = session?.user?.id || lastSessionState?.userId;
        if (authToken) {
          console.log("[Socket] Authenticating with user ID:", authToken);
          globalSocket?.emit('authenticate', { token: authToken });
        } else {
          console.log("[Socket] No session user ID available for authentication");
        }
      });

      globalSocket.on('reconnect', () => {
        console.log("[Socket] Reconnected, re-authenticating...");
        const authToken = session?.user?.id || lastSessionState?.userId;
        if (authToken) {
          console.log("[Socket] Re-authenticating with user ID:", authToken);
          globalSocket?.emit('authenticate', { token: authToken });
        }
      });

      globalSocket.on('disconnect', (reason) => {
        console.log("[Socket] Disconnected:", reason);
      });

      globalSocket.on('error', (error) => {
        console.error("[Socket] Error:", error);
      });
    }

    return () => {
      // Don't disconnect the socket on component unmount
      // It will be reused across the app
    };
  }, [session?.user?.id]);

  return globalSocket;
}; 