"use client";

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

let globalSocket: Socket | null = null;

export const useSocket = () => {
  const { data: session } = useSession();

  useEffect(() => {
    if (!globalSocket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002';
      globalSocket = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      globalSocket.on('connect', () => {
        console.log("[Socket] Connected, session state:", {
          hasSession: !!session,
          userId: session?.user?.id,
          userRole: session?.user?.role
        });
        if (session?.user?.id) {
          console.log("[Socket] Authenticating with user ID:", session.user.id);
          globalSocket?.emit('authenticate', { token: session.user.id });
        } else {
          console.log("[Socket] No session user ID available for authentication");
        }
      });

      globalSocket.on('reconnect', () => {
        console.log("[Socket] Reconnected, re-authenticating...");
        if (session?.user?.id) {
          console.log("[Socket] Re-authenticating with user ID:", session.user.id);
          globalSocket?.emit('authenticate', { token: session.user.id });
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