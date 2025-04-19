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
    origin: process.env.APP_URL || "https://social-land.ro",
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
  reconnectionDelayMax: 5000,
  maxHttpBufferSize: 1e8,
  perMessageDeflate: {
    threshold: 32768
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 60 * 1000,
    skipMiddlewares: true,
  },
  path: '/socket.io/',
  debug: true
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

// Add error logging
server.on('error', (error) => {
  console.error('[SOCKET] Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error('[SOCKET] Port already in use, trying alternative port');
    const newPort = (process.env.SOCKET_PORT || 5002) + 1;
    server.listen(newPort);
  }
});

// Add connection logging
io.on('connection', (socket) => {
  console.log('[SOCKET] New connection:', socket.id);
  
  socket.on('error', (error) => {
    console.error('[SOCKET] Socket error:', error);
  });
});

// Add server start logging
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const PORT = process.env.SOCKET_PORT || 5002;
    const HOST = '0.0.0.0';
    
    console.log(`[SOCKET] Starting server on ${HOST}:${PORT}`);
    server.listen(PORT, HOST, () => {
      console.log(`[SOCKET] Server started successfully on ${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('[SOCKET] Failed to start server:', error);
  }
};

// Socket connection handling
io.on("connection", (socket) => {
  // Add socket to active clients
  activeClients.set(socket.id, socket);
  socketActivity.set(socket.id, Date.now());

  // Handle authentication
  socket.on("authenticate", async (data) => {
    try {
      console.log("[Socket Server] Authentication attempt:", { 
        socketId: socket.id,
        hasUserId: !!data?.token 
      });

      const { token: userId } = data;
      
      if (!userId) {
        console.log("[Socket Server] Authentication failed: No user ID provided");
        return;
      }

      // Associate socket with user
      socket.userId = userId;
      console.log("[Socket Server] Socket associated with user:", {
        socketId: socket.id,
        userId: userId
      });
      
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
          
          console.log("[Socket Server] Sending verification status:", {
            userId,
            isVerified: !!user?.verified,
            hasRequest: !!verificationRequest
          });

          socket.emit(`user:${userId}`, {
            type: "VERIFICATION_STATUS_UPDATE",
            data: {
              hasRequest: !!verificationRequest,
              status: verificationRequest?.status || null,
              isVerified: !!user?.verified
            }
          });

          // Emit authentication success
          socket.emit("authenticated", { userId });
        }
      } catch (error) {
        console.error("[Socket Server] Error during verification check:", error);
      }
    } catch (error) {
      console.error("[Socket Server] Authentication error:", error);
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

