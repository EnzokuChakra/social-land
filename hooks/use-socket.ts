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
        // Connection established
      });

      globalSocket.on('connect_error', (error) => {
        toast.error('Connection error. Retrying...');
      });

      globalSocket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
          toast.error('Connection lost. Reconnecting...');
          globalSocket?.connect();
        }
      });

      globalSocket.on('error', (error) => {
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