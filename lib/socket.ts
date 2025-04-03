// Assuming you have a utility function that provides the socket instance
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
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
            console.log('Socket connected');
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected', reason);
        });
    }
    return socket;
};
