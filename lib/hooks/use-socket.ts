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
      
      globalSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 45000,
        forceNew: false, // Don't create a new connection if one exists
        withCredentials: true,
        path: '/socket.io/',
        secure: true,
        rejectUnauthorized: false,
        auth: {
          token: typeof window !== 'undefined' ? localStorage.getItem('socket_token') : null
        },
        upgrade: true,
        rememberUpgrade: true,
      });

      // Handle connection events
      globalSocket.on('connect', () => {
        console.log('[SOCKET_CONNECTED]', {
          socketId: globalSocket?.id,
          transport: globalSocket?.io?.engine?.transport?.name,
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
      });

      globalSocket.on('connect_error', (error) => {
        console.error('[SOCKET_CONNECT_ERROR]', {
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
        console.log('[SOCKET_DISCONNECT]', {
          reason,
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
        
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
          toast.error('Connection lost. Reconnecting...');
          globalSocket?.connect();
        }
      });

      globalSocket.on('error', (error) => {
        console.error('[SOCKET_ERROR]', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error),
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
        toast.error('Socket error occurred');
      });
    }

    socketRef.current = globalSocket;

    // Cleanup function
    return () => {
      // Don't disconnect the global socket, just remove the reference
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
} 