// Assuming you have a utility function that provides the socket instance
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002", {
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
            },
        });

        socket.on('connect', () => {
            console.log('[SOCKET] Connected', {
                socketId: socket?.id,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('connect_error', (error) => {
            console.error('[SOCKET] Connection error:', {
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : String(error),
                timestamp: new Date().toISOString()
            });
            socket?.connect();
        });

        socket.on('disconnect', (reason) => {
            console.log('[SOCKET] Disconnected:', {
                reason,
                timestamp: new Date().toISOString()
            });
            
            if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
                socket?.connect();
            }
        });

        socket.on('error', (error) => {
            console.error('[SOCKET] Error:', {
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : String(error),
                timestamp: new Date().toISOString()
            });
        });
    }
    return socket;
};
