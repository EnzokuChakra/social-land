"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { Event, EventWithUser, UserRole, UserStatus, EventStatus } from "@/lib/definitions";
import { fetchEvents } from "@/lib/actions";
import { CalendarDays, Search, CalendarClock, Trophy, MoreVertical, Trash2 } from "lucide-react";
import CreateEventButton from "@/components/events/CreateEventButton";
import EventViewModal from "@/components/events/EventViewModal";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isPast, isFuture } from "date-fns";
import Image from "next/image";
import { 
  formatCurrency, 
  isEventOngoing,
  isEventEnded,
  isEventUpcoming,
  formatDateToBucharest, 
  formatTimeToBucharest 
} from "@/lib/utils";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EventCard from "@/components/events/EventCard";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function getStatusColor(startDate: Date) {
  if (isEventOngoing(startDate)) {
    return {
      bg: "bg-green-500",
      text: "text-white",
    };
  } else if (isEventEnded(startDate)) {
    return {
      bg: "bg-gray-500",
      text: "text-white",
    };
  } else {
    return {
      bg: "bg-orange-500",
      text: "text-white",
    };
  }
}

function getStatusText(startDate: Date): EventStatus {
  if (isEventOngoing(startDate)) {
    return "ONGOING";
  } else if (isEventEnded(startDate)) {
    return "ENDED";
  } else {
    return "UPCOMING";
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<EventStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithUser | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const socket = getSocket();
  const [socketConnected, setSocketConnected] = useState(false);

  // Handle WebSocket connection status
  useEffect(() => {
    if (socket) {
      const handleConnect = () => {
        setSocketConnected(true);
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
      };

      const handleError = (error: Error) => {
        console.error("[EVENTS_PAGE] WebSocket error:", error);
        setSocketConnected(false);
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("error", handleError);

      return () => {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("error", handleError);
      };
    }
  }, [socket]);

  const filterEvents = useCallback((events: EventWithUser[]) => {
    if (!Array.isArray(events)) {
      return [];
    }
    
    const filtered = events.filter((event) => {
      if (!event || typeof event !== 'object') {
        return false;
      }
      const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const eventStatus = getStatusText(new Date(event.startDate));
      const matchesFilter = activeFilter === "ALL" || eventStatus === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
    
    return filtered;
  }, [searchQuery, activeFilter]);

  const sortedEvents = useMemo(() => {
    if (!Array.isArray(events)) {
      return [];
    }
    
    const filteredEvents = filterEvents(events);
    
    const sorted = filteredEvents.sort((a: EventWithUser, b: EventWithUser) => {
      const aDate = new Date(a.startDate);
      const bDate = new Date(b.startDate);
      const aStatus = getStatusText(aDate);
      const bStatus = getStatusText(bDate);
      
      const statusPriority: Record<EventStatus, number> = { 
        ONGOING: 0, 
        UPCOMING: 1, 
        ENDED: 2 
      };
      
      if (statusPriority[aStatus] !== statusPriority[bStatus]) {
        return statusPriority[aStatus] - statusPriority[bStatus];
      }
      
      return aDate.getTime() - bDate.getTime();
    });
    
    return sorted;
  }, [events, filterEvents]);

  const handleCreateEvent = async (formData: FormData) => {
    if (!session?.user) {
      toast.error("You must be logged in to create an event");
      return Promise.reject(new Error("Not authenticated"));
    }

    // Generate a temporary ID for the event
    const tempId = 'temp-' + Date.now();
    
    try {
      // Create a temporary event with optimistic data
      const tempEvent: EventWithUser = {
        id: tempId, // Temporary ID
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        description: formData.get('description') as string,
        rules: formData.get('rules') as string,
        prize: formData.get('prize') as string,
        prizes: formData.get('prize') as string,
        location: formData.get('location') as string,
        startDate: new Date(formData.get('startDate') as string),
        photoUrl: '/images/profile_placeholder.webp', // Temporary placeholder
        user_id: session.user.id,
        status: 'UPCOMING' as const,
        user: {
          id: session.user.id,
          username: session.user.username || 'user',
          name: session.user.name || 'User',
          image: session.user.image || '/images/profile_placeholder.webp',
          verified: session.user.verified || false,
          role: (session.user.role as UserRole) || 'USER',
          status: 'ACTIVE' as UserStatus,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          interested: 0,
          participants: 0
        }
      };

      // Wait for the session to be fully loaded before updating the UI
      if (sessionStatus !== 'authenticated') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Optimistically update the UI
      setEvents(prev => [tempEvent, ...prev]);

      // Make the actual API call
      const response = await fetch('/api/events', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create event' }));
        throw new Error(errorData.error || 'Failed to create event');
      }

      const createdEvent = await response.json();

      // Update the temporary event with the real one
      setEvents(prev => prev.map(event => 
        event.id === tempId ? createdEvent : event
      ));

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("newEvent", createdEvent);
      }

      toast.success('Event created successfully!');
      return Promise.resolve();
    } catch (error) {
      // Remove the temporary event on error
      setEvents(prev => prev.filter(event => event.id !== tempId));
      console.error('Event creation error:', error);
      
      // Show error toast and reject the promise
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
      toast.error(errorMessage);
      return Promise.reject(error);
    }
  };

  const handleDelete = async (eventId: string) => {
    // Optimistically remove the event from the UI
    const eventToDelete = events.find(event => event.id === eventId);
    setEvents(prev => prev.filter(event => event.id !== eventId));

    try {
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("deleteEvent", eventId);
      }

      toast.success("Event deleted successfully");
    } catch (error) {
      // Revert the optimistic update on error
      if (eventToDelete) {
        setEvents(prev => [...prev, eventToDelete]);
      }
      toast.error("Failed to delete event");
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          setEvents([]);
          return;
        }

        const validEvents = data.filter(event => {
          return event && 
            typeof event === 'object' && 
            'id' in event && 
            'name' in event && 
            'startDate' in event;
        });

        setEvents(validEvents);
      } catch (error) {
        console.error("[DEBUG] Error fetching events:", error);
        toast.error("Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Only set up socket listeners if socket is available and connected
  useEffect(() => {
    if (!socket || !socketConnected) return;

    const handleNewEvent = (newEvent: EventWithUser) => {
      setEvents(prev => {
        const currentEvents = Array.isArray(prev) ? prev : [];
        return [newEvent, ...currentEvents];
      });
    };

    const handleEventDeleted = (eventId: string) => {
      setEvents(prev => {
        const currentEvents = Array.isArray(prev) ? prev : [];
        return currentEvents.filter(event => event.id !== eventId);
      });
    };

    socket.on("newEvent", handleNewEvent);
    socket.on("deleteEvent", handleEventDeleted);

    return () => {
      socket.off("newEvent", handleNewEvent);
      socket.off("deleteEvent", handleEventDeleted);
    };
  }, [socket, socketConnected]);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">Browse and manage upcoming events</p>
        </div>
        {session?.user?.verified && (
          <CreateEventButton onEventCreate={handleCreateEvent} />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeFilter === "ALL" ? "default" : "outline"}
            onClick={() => setActiveFilter("ALL")}
          >
            All
          </Button>
          <Button
            variant={activeFilter === "UPCOMING" ? "default" : "outline"}
            onClick={() => setActiveFilter("UPCOMING")}
          >
            Upcoming
          </Button>
          <Button
            variant={activeFilter === "ONGOING" ? "default" : "outline"}
            onClick={() => setActiveFilter("ONGOING")}
          >
            Ongoing
          </Button>
          <Button
            variant={activeFilter === "ENDED" ? "default" : "outline"}
            onClick={() => setActiveFilter("ENDED")}
          >
            Ended
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="container max-w-7xl mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
          <CustomLoader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(() => {
            const eventsToRender = Array.isArray(sortedEvents) ? sortedEvents : [];
            
            if (eventsToRender.length === 0) {
              return (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events found</h3>
                  <p className="text-sm text-muted-foreground max-w-[400px]">
                    {searchQuery 
                      ? "Try adjusting your search query or check back later for new events."
                      : "There are no events scheduled at the moment. Check back later or create a new event."}
                  </p>
                </div>
              );
            }

            return eventsToRender.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                status={getStatusText(new Date(event.startDate))}
                onDelete={() => handleDelete(event.id)}
              />
            ));
          })()}
        </div>
      )}
    </div>
  );
} 