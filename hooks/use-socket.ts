"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// Create a single socket instance that can be reused
let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!globalSocket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002';
      
      console.log("[useSocket] Initializing socket connection to:", socketUrl);
      
      globalSocket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 100000,
        secure: false,
        rejectUnauthorized: false,
        path: '/socket.io/',
        extraHeaders: {
          'Access-Control-Allow-Origin': '*',
        }
      });

      // Handle connection events
      globalSocket.on('connect', () => {
        console.log("[useSocket] Socket connected", {
          socketId: globalSocket?.id,
          timestamp: new Date().toISOString()
        });
      });

      globalSocket.on('connect_error', (error) => {
        console.error("[useSocket] Connection error:", error);
        toast.error('Connection error. Retrying...');
      });

      globalSocket.on('disconnect', (reason) => {
        console.log("[useSocket] Socket disconnected:", reason);
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
          toast.error('Connection lost. Reconnecting...');
          globalSocket?.connect();
        }
      });

      globalSocket.on('error', (error) => {
        console.error("[useSocket] Socket error:", error);
        toast.error('Socket error occurred');
      });
    }

    socketRef.current = globalSocket;

    // Cleanup function
    return () => {
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
} 