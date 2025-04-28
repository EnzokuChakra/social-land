/* eslint-disable quotes */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const app = express();

// Initialize Prisma with error handling and reconnection
let prisma;
function initializePrisma() {
  try {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  } catch (error) {
    console.error("[SOCKET] Failed to initialize Prisma client:", error);
    // Retry after 5 seconds
    setTimeout(initializePrisma, 5000);
  }
}

// Initial Prisma initialization
initializePrisma();

// Express CORS middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1+1 AS result`;
    await prisma.verificationrequest.findMany({
      take: 1
    });
  } catch (error) {
    console.error("[SOCKET] Database connection test failed:", error);
    // Reinitialize Prisma on connection failure
    initializePrisma();
  }
}

// Add route to handle emitting events from the API
app.post('/emit', (req, res) => {
  try {
    const { event, data } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event name is required' });
    }
    
    console.log(`[SOCKET API] Emitting event '${event}' with data:`, data);
    
    // Special handling for specific events
    if (event === 'storyDeleted') {
      console.log('[SOCKET API] Story deletion event received, notifying all clients');
    }
    
    // Emit the event to all connected clients
    io.emit(event, data);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SOCKET API] Error emitting event:', error);
    return res.status(500).json({ error: 'Failed to emit event' });
  }
});

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

const PORT = process.env.PORT || 5002;

// Store active clients
const activeClients = new Map();

// Add connection tracking
const userSockets = new Map();

// Track last activity time for each socket
const socketActivity = new Map();

// Store maintenance mode state
let maintenanceMode = false;
let maintenanceMessage = "We're making some improvements to bring you a better experience. We'll be back shortly!";

// Periodically clean up inactive sockets
setInterval(() => {
  try {
    const now = Date.now();
    const inactiveTimeout = 30 * 60 * 1000; // 30 minutes
    
    // Check each active client
    for (const [socketId, socket] of activeClients.entries()) {
      const lastActive = socketActivity.get(socketId) || 0;
      
      // If socket hasn't had activity for 30 minutes, disconnect it
      if (now - lastActive > inactiveTimeout) {
        console.log(`[SOCKET] Cleaning up inactive socket: ${socketId}`);
        try {
          socket.disconnect(true);
        } catch (error) {
          console.error(`[SOCKET] Error disconnecting inactive socket: ${socketId}`, error);
        }
        
        // Clean up tracking maps
        activeClients.delete(socketId);
        socketActivity.delete(socketId);
      }
    }
    
    console.log(`[SOCKET] Cleanup complete. Active clients: ${activeClients.size}`);
  } catch (error) {
    console.error("[SOCKET] Error during socket cleanup:", error);
  }
}, 10 * 60 * 1000); // Run every 10 minutes

// Check database connection
async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1+1 AS result`;
    return true;
  } catch (error) {
    console.error("[SOCKET] Database connection error:", error);
    return false;
  }
}

// Check initial maintenance mode status from database on startup
async function checkMaintenanceStatus() {
  try {
    // Check database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.warn("[SOCKET] Skipping maintenance check due to database connection issue");
      return;
    }
    
    const maintenanceSetting = await prisma.setting.findUnique({
      where: { key: "maintenanceMode" }
    });
    
    if (maintenanceSetting) {
      maintenanceMode = maintenanceSetting.value === "true";
      console.log("[SOCKET] Initial maintenance mode status:", maintenanceMode);
    }
  } catch (error) {
    console.error("[SOCKET] Error checking initial maintenance mode:", error);
  }
}

// Call on server startup
checkMaintenanceStatus().then(async () => {
  // Test database connection
  await testDatabaseConnection();
  
  // Start the server
  server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
  });
}).catch(error => {
  console.error("Failed to start socket server:", error);
  // Start the server anyway to allow connections
  server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT} (with startup errors)`);
  });
});

// Add a helper function to emit to all user sockets
function emitToUser(userId, eventName, data) {
  if (userSockets.has(userId)) {
    const sockets = userSockets.get(userId);
    for (const socket of sockets) {
      socket.emit(eventName, data);
    }
    console.log(`[SOCKET] Emitted ${eventName} to ${sockets.size} sockets for user ${userId}`);
    return true;
  }
  console.log(`[SOCKET] No sockets found for user ${userId}`);
  return false;
}

// Add error handling for Prisma operations
async function safePrismaOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'P2021' || error.code === 'P1001') {
      console.error("[SOCKET] Database connection error, reinitializing Prisma...");
      initializePrisma();
      // Retry the operation after reinitialization
      return await operation();
    }
    throw error;
  }
}

// Modify the broadcastVerificationStatus function to use safePrismaOperation
async function broadcastVerificationStatus(userId) {
  try {
    if (!userSockets.has(userId)) {
      console.log(`[SOCKET] No sockets to broadcast status to for user ${userId}`);
      return false;
    }
    
    // Get current verification status using safe operation
    const user = await safePrismaOperation(() => 
      prisma.user.findUnique({
        where: { id: userId },
        select: { verified: true },
      })
    );
    
    const verificationRequest = await safePrismaOperation(() =>
      prisma.verificationrequest.findFirst({
        where: { 
          userId,
          status: "PENDING" 
        },
        orderBy: { createdAt: "desc" },
      })
    );
    
    // Broadcast to all sockets for this user
    const sockets = userSockets.get(userId);
    for (const socket of sockets) {
      socket.emit(`user:${userId}`, {
        type: "VERIFICATION_STATUS_UPDATE",
        data: {
          hasRequest: !!verificationRequest,
          status: verificationRequest?.status || null,
          isVerified: !!user?.verified
        }
      });
    }
    
    console.log(`[SOCKET] Broadcasted verification status to ${sockets.size} socket(s) for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[SOCKET] Error broadcasting verification status:`, error);
    return false;
  }
}

// Socket event handling
io.on("connection", (socket) => {
  console.log("[SOCKET] New client connected:", socket.id);
  activeClients.set(socket.id, socket);
  socketActivity.set(socket.id, Date.now());
  
  // Update activity timestamp on any socket event
  const updateActivity = () => {
    socketActivity.set(socket.id, Date.now());
  };
  
  // Attach the activity tracker to all events
  socket.onAny(updateActivity);
  
  // Send current maintenance mode status to the new client
  socket.emit("maintenanceStatus", {
    maintenanceMode: maintenanceMode,
    message: maintenanceMessage
  });

  // Handle user authentication
  socket.on("authenticate", async (data) => {
    try {
      const userId = data.token;
      if (!userId) {
        console.log("[SOCKET] No user ID provided for authentication");
        return;
      }

      console.log("[SOCKET] User authenticated:", { userId });
      
      // Associate socket with this user
      socket.userId = userId;
      
      // If user already has a socket, keep track of all of them
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      
      // Add this socket to the user's set of sockets
      userSockets.get(userId).add(socket);
      console.log("[SOCKET] Stored new socket for user:", { userId });
      
      // Send success message to client
      socket.emit("authenticated", { success: true });
    } catch (error) {
      console.error("[SOCKET] Authentication error:", error);
      socket.emit("authenticated", { success: false, error: error.message });
    }
  });

  // Handle user ban event
  socket.on("userBanned", (data) => {
    const { userId } = data;
    if (userId) {
      // Emit to the specific user's sockets
      emitToUser(userId, "userBanned", { userId });
    }
  });

  // Handle clearing follow requests
  socket.on("clearFollowRequests", async (data) => {
    try {
      console.log("[SOCKET] Received clearFollowRequests event:", data);
      const { userId, action } = data;
      
      if (!userId) {
        console.error("[SOCKET] Missing userId in clearFollowRequests event");
        return;
      }
      
      if (action === "clear") {
        console.log("[SOCKET] Finding pending follow requests for user:", userId);
        // Find all pending follow requests for this user
        let pendingRequests;
        try {
          pendingRequests = await prisma.follows.findMany({
            where: {
              followingId: userId,
              status: "PENDING"
            },
            select: {
              followerId: true,
              followingId: true,
              status: true
            }
          });
          console.log("[SOCKET] Found pending requests:", pendingRequests.length, "requests");
        } catch (error) {
          console.error("[SOCKET] Error finding pending requests:", error);
          return;
        }

        // Delete all pending requests
        try {
          const deleteResult = await prisma.follows.deleteMany({
            where: {
              followingId: userId,
              status: "PENDING"
            }
          });
          console.log("[SOCKET] Deleted follow requests:", deleteResult.count, "requests");
        } catch (error) {
          console.error("[SOCKET] Error deleting follow requests:", error);
          return;
        }

        // Delete all follow request notifications
        try {
          const notificationDeleteResult = await prisma.notification.deleteMany({
            where: {
              type: "FOLLOW_REQUEST",
              OR: [
                { userId: userId },
                { sender_id: userId }
              ]
            }
          });
          console.log("[SOCKET] Deleted notifications:", notificationDeleteResult.count, "notifications");
        } catch (error) {
          console.error("[SOCKET] Error deleting notifications:", error);
          return;
        }

        // Notify all affected users
        if (pendingRequests.length > 0) {
          console.log("[SOCKET] Notifying affected users");
          pendingRequests.forEach(request => {
            const userSocket = userSockets.get(request.followerId);
            if (userSocket) {
              console.log("[SOCKET] Notifying user:", request.followerId);
              userSocket.emit("followRequestsCleared", {
                userId: userId,
                action: "clear"
              });
            } else {
              console.log("[SOCKET] No socket found for user:", request.followerId);
            }
          });

          // Also notify the user who switched to public
          const userSocket = userSockets.get(userId);
          if (userSocket) {
            console.log("[SOCKET] Notifying user who switched to public:", userId);
            userSocket.emit("followRequestsCleared", {
              userId: userId,
              action: "clear"
            });
          } else {
            console.log("[SOCKET] No socket found for user who switched to public:", userId);
          }
        } else {
          console.log("[SOCKET] No pending requests to clear");
        }
      } else {
        console.log("[SOCKET] Invalid action:", action);
      }
    } catch (error) {
      console.error("[SOCKET] Error in clearFollowRequests handler:", error);
    }
  });

  // Only log errors
  socket.on("error", (error) => {
    console.error("[SOCKET] Error:", error);
  });

  // Handle notification event
  socket.on("notification", async (data) => {
    try {
      // Direct socket emission for immediate delivery
      if (data.userId) {
        // Find the user's socket directly
        const userSocket = userSockets.get(data.userId);
        if (userSocket) {
          userSocket.emit("newNotification", data);
        }
      } else {
        // Broadcast to all users
        io.emit("newNotification", data);
      }

      // Create notification in database asynchronously without waiting
      prisma.notification.create({
        data: {
          type: data.type,
          userId: data.userId,
          senderId: data.senderId,
          read: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      }).catch(error => {
        console.error("[SOCKET] Error creating notification in database:", error);
      });
    } catch (error) {
      console.error("[SOCKET] Error handling notification:", error);
    }
  });

  // Handle marking a notification as read
  socket.on("mark-notification-read", async (notificationId) => {
    try {
      if (!prisma) {
        console.error('[SOCKET] Database connection not available');
        return;
      }

      // First check if the notification exists
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        console.log('[SOCKET] Notification not found:', notificationId);
        return;
      }

      // Only update if the notification exists
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      });

      console.log('[SOCKET] Notification marked as read:', notificationId);
    } catch (error) {
      console.error('[SOCKET] Error marking notification as read:', error);
    }
  });

  // Handle initial notifications request
  socket.on("getInitialNotifications", async (userId) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: userId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              image: true,
              isPrivate: true,
              followers: {
                where: {
                  followerId: userId,
                },
                select: {
                  status: true,
                },
              },
              following: {
                where: {
                  followingId: userId,
                },
                select: {
                  status: true,
                },
              },
            },
          },
          post: {
            select: {
              id: true,
              fileUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const followRequests = notifications.filter((n) => n.type === "FOLLOW_REQUEST");

      socket.emit("initialNotifications", {
        notifications,
        followRequests,
      });
    } catch (error) {
      console.error("[SOCKET] Error fetching initial notifications:", error);
    }
  });

  // Handle joining user room
  socket.on("joinUserRoom", (userId) => {
    if (!userId) return;

    const room = `user_${userId}`;
    socket.join(room);
  });

  // Handle leaving user room
  socket.on("leaveUserRoom", (userId) => {
    if (!userId) return;

    const room = `user_${userId}`;
    socket.leave(room);
  });

  // Handle maintenance mode updates
  socket.on("maintenanceMode", async (data) => {
    try {
      if (typeof data.maintenanceMode !== 'boolean') {
        console.error("[SOCKET] Invalid maintenance mode value:", data.maintenanceMode);
        return;
      }
      
      // Update local maintenance mode state
      maintenanceMode = data.maintenanceMode;
      if (data.message) {
        maintenanceMessage = data.message;
      }
      
      // Broadcast to all clients
      io.emit("maintenanceStatus", {
        maintenanceMode: maintenanceMode,
        message: maintenanceMessage
      });
      
      // Log the update
      console.log("[SOCKET] Maintenance mode updated:", { 
        maintenanceMode, 
        message: maintenanceMessage 
      });
    } catch (error) {
      console.error("[SOCKET] Error handling maintenance mode update:", error);
    }
  });

  // Story events
  socket.on("storyLike", (data) => {
    io.emit("storyLikeUpdate", data);
  });

  socket.on("storyView", (data) => {
    console.log("[SOCKET] Received storyView event:", {
      storyId: data.storyId,
      userId: data.userId,
      viewerId: data.viewerId,
      socketId: socket.id
    });

    // Emit to all clients including sender
    io.emit("storyViewUpdate", data);
    console.log("[SOCKET] Emitted storyViewUpdate to all clients");
  });

  socket.on("storyDeleted", (data) => {
    console.log("[SOCKET] Story deleted:", data);
    io.emit("storyDeleted", data);
  });

  // Post events
  socket.on("like", (data) => {
    io.emit("likeUpdate", {
      ...data,
      requestId: data.requestId || null
    });
  });

  socket.on("commentUpdate", (data) => {
    io.emit("commentUpdate", data);
  });

  socket.on("commentCreate", (data) => {
    io.emit("commentUpdate", data);
  });

  socket.on("deleteComment", (data) => {
    io.emit("commentDelete", data);
  });

  socket.on("followUnfollowEvent", (data) => {
    io.emit("followUnfollowEvent", data);
  });

  // Handle comment like updates
  socket.on("commentLikeUpdate", (data) => {
    if (!socket.userId) {
      console.log("[SOCKET] Unauthenticated user trying to update comment like");
      return;
    }

    // Validate data
    if (!data.commentId || !data.userId || !data.action) {
      console.log("[SOCKET] Invalid comment like update data:", data);
      return;
    }

    // Broadcast the update to all connected clients
    io.emit("commentLikeUpdate", {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("bookmarkUpdate", (data) => { io.emit("bookmarkUpdate", data); });

  // Handle both old and new event name for backward compatibility
  socket.on("profileUpdate", (data) => {
    io.emit("updateProfile", data); // New event name
    io.emit("profileUpdate", data); // Old event name for backward compatibility
  });

  // Also listen for the new event name
  socket.on("updateProfile", (data) => {
    io.emit("updateProfile", data); // New event name
    io.emit("profileUpdate", data); // Old event name for backward compatibility
  });

  // Event handlers
  socket.on("newEvent", (data) => {
    io.emit("newEvent", data);
  });

  socket.on("deleteEvent", (eventId) => {
    io.emit("deleteEvent", eventId);
  });

  // Handle event interest updates
  socket.on("eventInterestUpdate", (data) => {
    console.log("[SOCKET] Received eventInterestUpdate:", data);
    io.emit("eventInterestUpdate", data);
  });

  // Handle event participation updates
  socket.on("eventParticipateUpdate", (data) => {
    console.log("[SOCKET] Received eventParticipateUpdate:", data);
    io.emit("eventParticipateUpdate", data);
  });

  // Handle follow request deletion
  socket.on("deleteFollowRequest", async (data) => {
    try {
      console.log("[SOCKET] Received deleteFollowRequest event:", data);
      const { followerId, followingId } = data;
      
      if (!followerId || !followingId) {
        console.error("[SOCKET] Missing followerId or followingId in deleteFollowRequest event");
        return;
      }

      // Delete the follow relationship
      const deleteResult = await prisma.follows.deleteMany({
        where: {
          followerId: followerId,
          followingId: followingId,
          status: "PENDING"
        }
      });

      console.log("[SOCKET] Deleted follow request:", deleteResult.count, "requests");

      // Delete the follow request notification
      const notificationDeleteResult = await prisma.notification.deleteMany({
        where: {
          type: "FOLLOW_REQUEST",
          userId: followingId,
          sender_id: followerId
        }
      });

      console.log("[SOCKET] Deleted notifications:", notificationDeleteResult.count, "notifications");

      // Notify both users
      const followerSocket = userSockets.get(followerId);
      const followingSocket = userSockets.get(followingId);

      if (followerSocket) {
        console.log("[SOCKET] Notifying follower:", followerId);
        followerSocket.emit("followRequestDeleted", {
          followingId: followingId,
          action: "delete"
        });
      }

      if (followingSocket) {
        console.log("[SOCKET] Notifying following user:", followingId);
        followingSocket.emit("followRequestDeleted", {
          followerId: followerId,
          action: "delete"
        });
      }
    } catch (error) {
      console.error("[SOCKET] Error in deleteFollowRequest handler:", error);
    }
  });

  // Handle post deletion event - make sure this is OUTSIDE the disconnect handler
  socket.on("postDeleted", (data) => {
    console.log("[SOCKET] Post deleted:", data);
    // Broadcast to all clients
    io.emit("postDeleted", { postId: data.postId });
  });

  // Handle client disconnect
  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Client disconnected:", socket.id, "Reason:", reason);
    activeClients.delete(socket.id);
    socketActivity.delete(socket.id);
    
    // Remove this socket from user's socket collection
    if (socket.userId && userSockets.has(socket.userId)) {
      const userSocketSet = userSockets.get(socket.userId);
      userSocketSet.delete(socket);
      
      // If no more sockets for this user, remove the user entry
      if (userSocketSet.size === 0) {
        console.log("[SOCKET] Removing socket for user:", { token: socket.userId });
        userSockets.delete(socket.userId);
      } else {
        console.log(`[SOCKET] User ${socket.userId} still has ${userSocketSet.size} active connections`);
      }
    }

    // Add handler for requesting verification status refresh
    socket.on("refreshVerificationStatus", async (userId) => {
      if (socket.userId !== userId) {
        console.log("[SOCKET] Unauthorized verification status refresh request");
        return;
      }
      
      await broadcastVerificationStatus(userId);
    });
  });

  // Add error handling for the Socket.IO server
  socket.on('error', (error) => {
    console.error('[SOCKET_SERVER] Error:', error);
  });

  // Handle follow request acceptance
  socket.on("acceptFollowRequest", async (data) => {
    try {
      const { followerId, followingId } = data;
      console.log(`[Socket] Accepting follow request from ${followerId} to ${followingId}`);

      // Update the follow status to ACCEPTED
      await prisma.follows.update({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        },
        data: {
          status: "ACCEPTED"
        }
      });

      // Delete any existing follow notifications
      await prisma.notification.deleteMany({
        where: {
          type: {
            in: ["FOLLOW", "FOLLOW_REQUEST"]
          },
          OR: [
            {
              sender_id: followerId,
              userId: followingId
            },
            {
              sender_id: followingId,
              userId: followerId
            }
          ]
        }
      });

      // Create a new follow notification
      await prisma.notification.create({
        data: {
          userId: followerId,
          type: "FOLLOW",
          sender_id: followingId,
          message: `@${followingId} accepted your follow request`
        }
      });

      // Get the sockets for both users
      const followerSocket = userSockets.get(followerId);
      const followingSocket = userSockets.get(followingId);

      // Emit to the follower that their request was accepted
      if (followerSocket) {
        console.log("[Socket] Emitting followRequestAccepted to follower:", followerId);
        followerSocket.emit("followRequestAccepted", {
          followingId: followingId,
          followerId: followerId
        });
      }

      // Emit to the following user that they have a new follower
      if (followingSocket) {
        console.log("[Socket] Emitting newFollower to following user:", followingId);
        followingSocket.emit("newFollower", {
          followerId: followerId,
          followingId: followingId
        });
      }

      // Also emit to all clients in the user's room
      io.to(`user_${followerId}`).emit("followRequestAccepted", {
        followingId: followingId,
        followerId: followerId
      });
      io.to(`user_${followingId}`).emit("newFollower", {
        followerId: followerId,
        followingId: followingId
      });

    } catch (error) {
      console.error("[Socket] Error accepting follow request:", error);
    }
  });
});

// Add error handling for the Socket.IO server
io.on('error', (error) => {
  console.error('[SOCKET_SERVER] Error:', error);
});

// Export the io instance
module.exports = { io };