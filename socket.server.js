/* eslint-disable quotes */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const app = express();

// Express CORS middleware
app.use(
  cors({
    origin: ["http://localhost:3000", process.env.APP_URL, "https://social-land.ro"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", process.env.APP_URL, "https://social-land.ro", "https://www.social-land.ro"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  path: '/socket.io/',
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  cookie: false,
  maxHttpBufferSize: 1e8,
  connectTimeout: 45000,
  timeout: 45000,
});

const PORT = process.env.PORT || 5002;

// Store active clients
const activeClients = new Map();

// Socket event handling
io.on("connection", (socket) => {
  console.log("[SOCKET] New Connection ID:", socket.id);
  let currentClient = null;

  // Set up ping/pong monitoring
  socket.conn.on('ping', () => {
    console.log('[SOCKET] Ping received from', socket.id);
  });

  socket.conn.on('pong', (latency) => {
    console.log('[SOCKET] Pong received from', socket.id, 'latency:', latency);
  });

  // Changed from io.on to socket.on for likeUpdate
  socket.on("likeUpdate", (data) => {
    console.log("[SOCKET] Like update received from", socket.id, ":", data);
    io.emit("likeUpdate", data);
  });

  // Handle profile updates
  socket.on("profileUpdate", (data) => {
    console.log("[SOCKET] Profile update received from", socket.id, ":", data);
    io.emit("profileUpdate", data);
  });

  // Handle disconnection
  socket.on("disconnect", async (reason) => {
    try {
      console.log("[SOCKET] Client disconnected:", socket.id, "Reason:", reason);
      if (currentClient) {
        await currentClient.destroy();
      }
      activeClients.delete(socket.id);
    } catch (error) {
      console.error("[SOCKET] Disconnect error:", error);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("[SOCKET] Error:", error);
  });
});

// Add error handling for the server
server.on('error', (error) => {
  console.error('[SERVER] Error:', error);
});

// Add error handling for the Socket.IO server
io.on('error', (error) => {
  console.error('[SOCKET_SERVER] Error:', error);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Socket running on port ${PORT}`);
  console.log(`[SERVER] WebSocket path: /socket.io/`);
  console.log(`[SERVER] Allowed origins: ${["http://localhost:3000", process.env.APP_URL, "https://social-land.ro"].join(', ')}`);
});
