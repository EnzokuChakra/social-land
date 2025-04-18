// Assuming you have a utility function that provides the socket instance
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002";

// Global socket instance
let socket: Socket | null = null;
let isConnecting = false;
let hasAuthenticated = false;
let currentUserId: string | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Create a singleton socket instance
export function getSocket() {
  if (!socket) {
    const isProduction = process.env.NODE_ENV === 'production';
    const socketUrl = isProduction
      ? 'wss://social-land.ro'  // Use secure WebSocket in production
      : process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5002";

    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      transports: ["websocket"],
      // Add these options for better production handling
      path: '/socket.io',
      secure: isProduction,
      rejectUnauthorized: false
    });

    socket.on("connect", () => {});

    socket.on("disconnect", () => {});

    socket.on("connect_error", (error) => {});
  }

  return socket;
}

// Function to authenticate the socket with a user ID
export function authenticateSocket(token: string) {
  const socket = getSocket();
  socket.emit("authenticate", { token });
}
