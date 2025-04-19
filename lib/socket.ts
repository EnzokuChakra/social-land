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
export function getSocket() {
  if (!socket && typeof window !== 'undefined') {
    const socketUrl = getSocketUrl();
    if (!socketUrl) return null;

    socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: MAX_CONNECTION_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false, // Don't connect automatically
      transports: ["websocket", "polling"], // Allow fallback to polling
      path: '/socket.io/',
      secure: process.env.NODE_ENV === 'production',
      rejectUnauthorized: false,
      // Add these options for better connection handling
      forceNew: true,
      rememberUpgrade: true,
      upgrade: true,
      // Add these options for better production handling
      perMessageDeflate: {
        threshold: 32768
      }
    });

    // Only connect after the page is fully loaded
    if (document.readyState === 'complete') {
      if (!socket?.connected) {
        socket?.connect();
      }
    } else {
      window.addEventListener('load', () => {
        if (!socket?.connected) {
          socket?.connect();
        }
      });
    }

    socket.on("connect", () => {
      console.log("[Socket] Connected successfully to", socketUrl);
      connectionAttempts = 0;
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      if (reason === "io server disconnect") {
        console.log("[Socket] Server initiated disconnect, attempting to reconnect...");
        socket?.connect();
      }
    });

    socket.on("connect_error", (error: Error & { type?: string; description?: string; context?: any }) => {
      console.error("[Socket] Connection error:", error.message);
      console.error("[Socket] Error details:", {
        type: error.type,
        description: error.description,
        context: error.context
      });
    });

    socket.on("error", (error) => {
      console.error("[Socket] General error:", error);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}/${MAX_CONNECTION_ATTEMPTS}`);
    });

    socket.on("reconnect_error", (error) => {
      console.error("[Socket] Reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("[Socket] Failed to reconnect after all attempts");
    });
  }

  return socket;
}

// Function to authenticate the socket with a user ID
export function authenticateSocket(token: string) {
  const socket = getSocket();
  if (socket) {
    socket.emit("authenticate", { token });
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
