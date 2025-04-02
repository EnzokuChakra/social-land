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
    origin: process.env.APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  transports: ['websocket'],
  allowUpgrades: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  reconnection: true,
  reconnectionAttempts: Infinity,
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

  // Only log errors
  socket.on("error", (error) => {
    console.error("[SOCKET] Error:", error);
  });

  // Maintenance mode events
  socket.on("maintenanceMode", (data) => {
    console.log("[SOCKET] Maintenance mode update:", data);
    // Broadcast maintenance mode change to all connected clients
    io.emit("maintenanceModeUpdate", {
      maintenanceMode: data.maintenanceMode,
      estimatedTime: data.estimatedTime || "2:00",
      message: data.message || "We're making some improvements to bring you a better experience. We'll be back shortly!"
    });
  });

  // Story events
  socket.on("storyLike", (data) => {
    socket.broadcast.emit("storyLikeUpdate", data);
  });

  socket.on("storyView", (data) => {
    socket.broadcast.emit("storyViewUpdate", data);
  });

  // Post events
  socket.on("like", (data) => {
    socket.broadcast.emit("likeUpdate", data);
  });

  socket.on("comment", (data) => {
    socket.broadcast.emit("commentUpdate", data);
  });

  socket.on("deleteComment", (data) => {
    socket.broadcast.emit("commentDelete", data);
  });

  socket.on("profileUpdate", (data) => {
    socket.broadcast.emit("profileUpdate", data);
  });

  socket.on("disconnect", () => {
    console.log("[SOCKET] Client disconnected:", socket.id);
    activeClients.delete(socket.id);
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
  console.log(`Socket server running on port ${PORT}`);
});
