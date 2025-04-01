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
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 45000,
        forceNew: false,
        withCredentials: true,
        path: '/socket.io/',
        secure: true,
        rejectUnauthorized: false,
        auth: {
          token: typeof window !== 'undefined' ? localStorage.getItem('socket_token') : null
        }
      });

      // Handle connection events
      globalSocket.on('connect', () => {
        console.log('[useSocket] Connected:', {
          socketId: globalSocket?.id,
          transport: globalSocket?.io?.engine?.transport?.name,
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
      });

      globalSocket.on('connect_error', (error) => {
        console.error('[useSocket] Connection error:', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error),
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
        
        toast.error('Connection error. Retrying...');
      });

      globalSocket.on('disconnect', (reason) => {
        console.log('[useSocket] Disconnected:', {
          reason,
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
        
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
          console.log('[useSocket] Attempting to reconnect...');
          globalSocket?.connect();
        }
      });
    }

    socketRef.current = globalSocket;

    // Cleanup function
    return () => {
      console.log('[useSocket] Cleaning up socket reference');
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
} 