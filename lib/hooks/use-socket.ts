"use client";

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002';

export function getSocket() {
  const socketRef = useRef<Socket | null>(null);
  const connectionAttemptsRef = useRef(0);
  const MAX_RECONNECTION_ATTEMPTS = 5;

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        connectionAttemptsRef.current = 0;
      });

      socket.on('connect_error', (error) => {
        connectionAttemptsRef.current++;

        if (connectionAttemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
          socket.disconnect();
        }
      });

      socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('error', (error) => {
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
} 