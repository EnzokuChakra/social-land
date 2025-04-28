import { useEffect, useState } from 'react';
import { getSocket } from "@/lib/socket";

export const useStorySocketDebug = () => {
  const socket = getSocket();
  const [socketStatus, setSocketStatus] = useState({
    connected: false,
    events: [] as { timestamp: string, event: string, data: any }[]
  });
  
  useEffect(() => {
    if (!socket) return;
    
    // Log socket connection status
    setSocketStatus(prev => ({ ...prev, connected: socket.connected }));
    
    const connectionHandler = () => {
      console.log("[SOCKET DEBUG] Connected to socket server");
      setSocketStatus(prev => ({ 
        ...prev, 
        connected: true,
        events: [...prev.events, {
          timestamp: new Date().toISOString(),
          event: 'connect',
          data: null
        }]
      }));
    };
    
    const disconnectionHandler = () => {
      console.log("[SOCKET DEBUG] Disconnected from socket server");
      setSocketStatus(prev => ({ 
        ...prev, 
        connected: false,
        events: [...prev.events, {
          timestamp: new Date().toISOString(),
          event: 'disconnect',
          data: null
        }]
      }));
    };
    
    const storyDeletedHandler = (data: any) => {
      console.log("[SOCKET DEBUG] Received storyDeleted event:", data);
      setSocketStatus(prev => ({ 
        ...prev,
        events: [...prev.events, {
          timestamp: new Date().toISOString(),
          event: 'storyDeleted',
          data
        }]
      }));
    };
    
    const storyLikeHandler = (data: any) => {
      console.log("[SOCKET DEBUG] Received storyLikeUpdate event:", data);
      setSocketStatus(prev => ({ 
        ...prev,
        events: [...prev.events, {
          timestamp: new Date().toISOString(),
          event: 'storyLikeUpdate',
          data
        }]
      }));
    };
    
    const storyViewHandler = (data: any) => {
      console.log("[SOCKET DEBUG] Received storyViewUpdate event:", data);
      setSocketStatus(prev => ({ 
        ...prev,
        events: [...prev.events, {
          timestamp: new Date().toISOString(),
          event: 'storyViewUpdate',
          data
        }]
      }));
    };
    
    // Register event handlers
    socket.on('connect', connectionHandler);
    socket.on('disconnect', disconnectionHandler);
    socket.on('storyDeleted', storyDeletedHandler);
    socket.on('storyLikeUpdate', storyLikeHandler);
    socket.on('storyViewUpdate', storyViewHandler);
    
    // Test socket connection
    if (socket.connected) {
      connectionHandler();
    }
    
    // Cleanup
    return () => {
      socket.off('connect', connectionHandler);
      socket.off('disconnect', disconnectionHandler);
      socket.off('storyDeleted', storyDeletedHandler);
      socket.off('storyLikeUpdate', storyLikeHandler);
      socket.off('storyViewUpdate', storyViewHandler);
    };
  }, [socket]);
  
  return socketStatus;
}; 