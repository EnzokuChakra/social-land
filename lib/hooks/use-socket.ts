"use client";

import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();

    // Cleanup function
    return () => {
      // Don't disconnect the global socket, just remove the reference
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
} 