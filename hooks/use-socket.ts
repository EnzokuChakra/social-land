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
      });

      globalSocket.on('connect', () => {
        if (session?.user?.id) {
          globalSocket?.emit('authenticate', { token: session.user.id });
        }
      });
    }

    return () => {
      // Don't disconnect the socket on component unmount
      // It will be reused across the app
    };
  }, [session?.user?.id]);

  return globalSocket;
}; 