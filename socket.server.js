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
    origin: process.env.APP_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.APP_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

const PORT = process.env.PORT || 5002;

// Store active clients
const activeClients = new Map();

// Socket event handling
io.on("connection", (socket) => {
  console.log("[SOCKET] New Connection ID:", socket.id);
  activeClients.set(socket.id, socket);

  // Handle like updates
  socket.on("likeUpdate", (data) => {
    try {
      console.log("[SOCKET] Like update received from", socket.id, ":", data);
      io.emit("likeUpdate", data);
    } catch (error) {
      console.error("[SOCKET] Error handling likeUpdate:", error);
    }
  });

  // Handle profile updates
  socket.on("profileUpdate", (data) => {
    try {
      console.log("[SOCKET] Profile update received from", socket.id, ":", data);
      io.emit("profileUpdate", data);
    } catch (error) {
      console.error("[SOCKET] Error handling profileUpdate:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    try {
      console.log("[SOCKET] Client disconnected:", socket.id);
      activeClients.delete(socket.id);
    } catch (error) {
      console.error("[SOCKET] Disconnect error:", error);
    }
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("[SOCKET] Error for client", socket.id, ":", error);
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
server.listen(PORT, () => {
  console.log(`[SERVER] Socket running on port ${PORT}`);
});
