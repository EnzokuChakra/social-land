// Assuming you have a utility function that provides the socket instance
import { io, Socket } from "socket.io-client";

// Get the correct socket URL based on environment
const getSocketUrl = () => {
  if (typeof window === 'undefined') return ''; // SSR
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction
    ? 'wss://social-land.ro'  // Use secure WebSocket in production
    : process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002";
};

// Global socket instance
let socket: Socket | null = null;
let isConnecting = false;
let hasAuthenticated = false;
let currentUserId: string | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Server-side socket instance
let serverSocket: Socket | null = null;

// Create a singleton socket instance
export const getSocket = () => {
  if (typeof window === 'undefined') return null;
  
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:5002', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      auth: (cb) => {
        const token = localStorage.getItem('next-auth.session-token');
        cb({ token });
      }
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      connectionAttempts = 0;
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      connectionAttempts++;
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        socket?.disconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        setTimeout(() => {
          socket?.connect();
        }, 1000);
      }
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
    });
  }
  
  return socket;
};

// Function to authenticate the socket with a user ID
export function authenticateSocket(userId: string) {
  const socket = getSocket();
  if (socket) {
    socket.emit('authenticate', { token: userId });
  }
}

// Get server-side socket instance
export function getServerSocket() {
  if (!serverSocket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002";
    serverSocket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: MAX_CONNECTION_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      transports: ["websocket", "polling"],
      path: '/socket.io/',
      secure: process.env.NODE_ENV === 'production',
      rejectUnauthorized: false,
      forceNew: true,
      rememberUpgrade: true,
      upgrade: true,
      perMessageDeflate: {
        threshold: 32768
      }
    });

    // Add connection event handlers
    serverSocket.on("connect", () => {
      console.log("[Server Socket] Connected to socket server");
    });

    serverSocket.on("disconnect", (reason) => {
      console.log("[Server Socket] Disconnected:", reason);
    });

    serverSocket.on("connect_error", (error) => {
      console.error("[Server Socket] Connection error:", error);
    });
  }
  return serverSocket;
}
