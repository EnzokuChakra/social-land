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
  activeClients.set(socket.id, socket);

  // Only log errors
  socket.on("error", (error) => {
    console.error("[SOCKET] Error:", error);
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
