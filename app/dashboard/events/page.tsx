"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/use-socket";
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
  const { data: session } = useSession();
  const socket = useSocket();

  // Handle WebSocket connection errors
  useEffect(() => {
    if (socket) {
      const handleError = (error: Error) => {
        console.error("[EVENTS_PAGE] WebSocket error:", error);
        // Don't show error to user, just log it
      };

      const handleConnectError = (error: Error) => {
        console.error("[EVENTS_PAGE] WebSocket connection error:", error);
        // Don't show error to user, just log it
      };

      socket.on("error", handleError);
      socket.on("connect_error", handleConnectError);

      return () => {
        socket.off("error", handleError);
        socket.off("connect_error", handleConnectError);
      };
    }
  }, [socket]);

  const filterEvents = (events: EventWithUser[]) => {
    console.log("[EVENTS_PAGE] Filtering events:", events);
    if (!Array.isArray(events)) {
      console.error("[EVENTS_PAGE] Events is not an array in filterEvents:", events);
      return [];
    }
    return events.filter((event) => {
      if (!event || typeof event !== 'object') {
        console.error("[EVENTS_PAGE] Invalid event object in filter:", event);
        return false;
      }
      const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const eventStatus = getStatusText(new Date(event.startDate));
      const matchesFilter = activeFilter === "ALL" || eventStatus === activeFilter;
      
      return matchesSearch && matchesFilter;
    });
  };

  const sortedEvents = useMemo(() => {
    console.log("[EVENTS_PAGE] Sorting events:", events);
    if (!Array.isArray(events)) {
      console.error("[EVENTS_PAGE] Events is not an array in sortedEvents:", events);
      return [];
    }
    return filterEvents(events).sort((a: EventWithUser, b: EventWithUser) => {
      const aDate = new Date(a.startDate);
      const bDate = new Date(b.startDate);
      const aStatus = getStatusText(aDate);
      const bStatus = getStatusText(bDate);
      
      // First sort by status priority (ONGOING > UPCOMING > ENDED)
      const statusPriority: Record<EventStatus, number> = { 
        ONGOING: 0, 
        UPCOMING: 1, 
        ENDED: 2 
      };
      
      if (statusPriority[aStatus] !== statusPriority[bStatus]) {
        return statusPriority[aStatus] - statusPriority[bStatus];
      }
      
      // Then sort by date within each status
      return aDate.getTime() - bDate.getTime();
    });
  }, [events, searchQuery, activeFilter]);

  const handleCreateEvent = async (formData: FormData) => {
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
        photoUrl: '/placeholder.jpg', // Temporary placeholder
        user_id: session?.user?.id || '',
        status: 'UPCOMING' as const,
        user: {
          id: session?.user?.id || '',
          username: session?.user?.username || null,
          name: session?.user?.name || null,
          image: session?.user?.image || null,
          verified: session?.user?.verified || false,
          role: (session?.user?.role as UserRole) || 'USER',
          status: 'ACTIVE' as UserStatus,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          interested: 0,
          participants: 0
        }
      };

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
        console.log("[EVENTS_PAGE] Fetching events...");
        const response = await fetch("/api/events");
        if (!response.ok) {
          console.error("[EVENTS_PAGE] Failed to fetch events:", response.status);
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        console.log("[EVENTS_PAGE] Received data:", data);
        
        if (!Array.isArray(data)) {
          console.error("[EVENTS_PAGE] Data is not an array:", data);
          setEvents([]);
          return;
        }

        // Ensure each event has the required properties
        const validEvents = data.filter(event => {
          const isValid = event && 
            typeof event === 'object' && 
            'id' in event && 
            'name' in event && 
            'startDate' in event;
          
          if (!isValid) {
            console.error("[EVENTS_PAGE] Invalid event object:", event);
          }
          return isValid;
        });

        console.log("[EVENTS_PAGE] Setting events:", validEvents.length);
        setEvents(validEvents);
      } catch (error) {
        console.error("[EVENTS_PAGE] Error:", error);
        toast.error("Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Only set up socket listeners if socket is available
  useEffect(() => {
    if (!socket) return;

    const handleNewEvent = (newEvent: EventWithUser) => {
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error("[EVENTS_PAGE] Previous events is not an array:", prev);
          return [newEvent];
        }
        return [newEvent, ...prev];
      });
    };

    const handleEventDeleted = (eventId: string) => {
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error("[EVENTS_PAGE] Previous events is not an array:", prev);
          return [];
        }
        return prev.filter(event => event.id !== eventId);
      });
    };

    socket.on("newEvent", handleNewEvent);
    socket.on("deleteEvent", handleEventDeleted);

    return () => {
      socket.off("newEvent", handleNewEvent);
      socket.off("deleteEvent", handleEventDeleted);
    };
  }, [socket]);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Events</h1>
          {session?.user?.verified && (
            <CreateEventButton onEventCreate={handleCreateEvent} />
          )}
        </div>
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeFilter === "ALL" ? "default" : "outline"}
          onClick={() => setActiveFilter("ALL")}
          className="flex items-center gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          All Events
        </Button>
        <Button
          variant={activeFilter === "UPCOMING" ? "default" : "outline"}
          onClick={() => setActiveFilter("UPCOMING")}
          className="flex items-center gap-2"
        >
          <CalendarClock className="h-4 w-4" />
          Upcoming
        </Button>
        <Button
          variant={activeFilter === "ONGOING" ? "default" : "outline"}
          onClick={() => setActiveFilter("ONGOING")}
          className="flex items-center gap-2"
        >
          <Trophy className="h-4 w-4" />
          Ongoing
        </Button>
        <Button
          variant={activeFilter === "ENDED" ? "default" : "outline"}
          onClick={() => setActiveFilter("ENDED")}
          className="flex items-center gap-2"
        >
          <CalendarDays className="h-4 w-4" />
          Ended
        </Button>
      </div>

      {loading ? (
        <div className="container max-w-7xl mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
          <CustomLoader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedEvents.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-sm text-muted-foreground max-w-[400px]">
                {searchQuery 
                  ? "Try adjusting your search query or check back later for new events."
                  : "There are no events scheduled at the moment. Check back later or create a new event."}
              </p>
            </div>
          ) : (
            sortedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                status={getStatusText(new Date(event.startDate))}
                onDelete={() => handleDelete(event.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
} 