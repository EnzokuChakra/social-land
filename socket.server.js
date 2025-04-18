/* eslint-disable quotes */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { PrismaClient } = require("@prisma/client");

// Only log when run directly (not during import/build)
const shouldLog = require.main === module;

const app = express();
let prisma = null;

// Express CORS middleware
app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Create HTTP server
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
  allowUpgrades: true,
  pingTimeout: 30000,
  pingInterval: 10000,
  connectTimeout: 20000,
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
  maxHttpBufferSize: 1e8,
  perMessageDeflate: {
    threshold: 32768
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 60 * 1000,
    skipMiddlewares: true,
  }
});

// Store active clients and user sockets
const activeClients = new Map();
const userSockets = new Map();
const socketActivity = new Map();

// Track maintenance mode state
let maintenanceMode = false;
let maintenanceMessage = "We're making some improvements to bring you a better experience. We'll be back shortly!";

// Initialize database connection
const initializeDatabase = async () => {
  try {
    prisma = new PrismaClient();
    if (shouldLog) console.log("[SOCKET] Prisma client initialized successfully");
    
    // Test database connection
    if (shouldLog) console.log("[SOCKET] Database connection successful");
    if (shouldLog) console.log("[SOCKET] Testing database connection...");
    
    const result = await prisma.$queryRaw`SELECT 1 + 1 as result`;
    if (shouldLog) console.log("[SOCKET] Database connection test successful:", result);
    
    // Test verificationrequest table
    const verificationRequests = await prisma.verificationrequest.findMany({
      take: 10,
    });
    
    if (shouldLog) console.log("[SOCKET] Verification request table test successful:", verificationRequests.length, "requests found");
    
    return true;
  } catch (error) {
    if (shouldLog) console.error("[SOCKET] Database connection error:", error);
    return false;
  }
};

// Error handling for server
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    // Address already in use, trying alternative port
    const newPort = (process.env.SOCKET_PORT || 5002) + 1;
    server.listen(newPort);
  }
});

// Define start server function
const startServer = async () => {
  // Initialize database before starting server
  await initializeDatabase();
  
  const PORT = process.env.SOCKET_PORT || 5002;
  const HOST = process.env.SOCKET_HOST || 'localhost';
  server.listen(PORT, HOST);
  
  if (shouldLog) console.log(`[SOCKET] Server started on ${HOST}:${PORT}`);
};

// Socket connection handling
io.on("connection", (socket) => {
  // Add socket to active clients
  activeClients.set(socket.id, socket);
  socketActivity.set(socket.id, Date.now());

  // Handle authentication
  socket.on("authenticate", async (data) => {
    try {
      const { token: userId } = data;
      
      if (!userId) {
        return;
      }

      // Associate socket with user
      socket.userId = userId;
      
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      
      userSockets.get(userId).add(socket);

      // Send verification status update
      try {
        if (prisma) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { verified: true }
          });
          
          const verificationRequest = await prisma.verificationrequest.findFirst({
            where: { 
              userId,
              status: "PENDING" 
            },
            orderBy: { createdAt: "desc" }
          });
          
          socket.emit(`user:${userId}`, {
            type: "VERIFICATION_STATUS_UPDATE",
            data: {
              hasRequest: !!verificationRequest,
              status: verificationRequest?.status || null,
              isVerified: !!user?.verified
            }
          });
        }
      } catch (error) {
        // Silently handle errors
      }
    } catch (error) {
      // Silently handle errors
    }
  });
// Story events
  socket.on("storyLike", (data) => {
    io.emit("storyLikeUpdate", data);
  });

  socket.on("storyView", (data) => {
    io.emit("storyViewUpdate", data);
  });

  // Post events
  socket.on("like", (data) => {
    io.emit("likeUpdate", data);
  });

  socket.on("commentUpdate", (data) => {
    io.emit("commentUpdate", data);
  });

  socket.on("deleteComment", (data) => {
    io.emit("commentDelete", data);
  });
  socket.on("followUnfollowEvent", (data) => {
    io.emit("followUnfollowEvent", data);
  });

  socket.on("commentLikeUpdate", (data) => { io.emit("commentLikeUpdate", data); });

  socket.on("profileUpdate", (data) => {
    io.emit("profileUpdate", data);
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    activeClients.delete(socket.id);
    socketActivity.delete(socket.id);
    
    if (socket.userId && userSockets.has(socket.userId)) {
      const userSocketSet = userSockets.get(socket.userId);
      userSocketSet.delete(socket);
      
      if (userSocketSet.size === 0) {
        userSockets.delete(socket.userId);
      }
    }
  });

  // Add error handling for individual socket
  socket.on('error', () => {
    // Silently handle errors
  });
});

// Add error handling for the Socket.IO server
io.on('error', () => {
  // Silently handle errors
});

// Only start the server when this file is run directly
if (require.main === module) {
  startServer();
}

// Export the io instance
module.exports = { io, startServer };

