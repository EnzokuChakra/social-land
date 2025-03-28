"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    if (!socketRef.current) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002';
      
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 45000,
        forceNew: true,
        withCredentials: true,
        path: '/socket.io/',
        secure: true,
        rejectUnauthorized: false,
        auth: {
          token: typeof window !== 'undefined' ? localStorage.getItem('socket_token') : null
        },
        upgrade: true,
        rememberUpgrade: true,
        query: {
          timestamp: Date.now(),
          EIO: 4
        },
        extraHeaders: {
          'Access-Control-Allow-Origin': '*'
        }
      });

      // Handle connection events
      socketRef.current.on('connect', () => {
        console.log('[SOCKET_CONNECTED]', {
          socketId: socketRef.current?.id,
          transport: socketRef.current?.io?.engine?.transport?.name,
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('[SOCKET_CONNECT_ERROR]', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error),
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
        
        // Attempt to reconnect on connection error
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            socketRef.current?.connect();
          }
        }, 1000);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('[SOCKET_DISCONNECT]', {
          reason,
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
        
        // Attempt to reconnect on certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
          setTimeout(() => {
            if (!socketRef.current?.connected) {
              socketRef.current?.connect();
            }
          }, 1000);
        }
      });

      socketRef.current.on('error', (error) => {
        console.error('[SOCKET_ERROR]', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error),
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
      });

      // Add transport error handler
      socketRef.current.io?.engine?.on('error', (error) => {
        console.error('[SOCKET_ENGINE_ERROR]', {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error),
          url: socketUrl,
          timestamp: new Date().toISOString()
        });
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
} 