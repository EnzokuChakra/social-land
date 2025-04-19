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
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithUser | null>(null);
  const [socketError, setSocketError] = useState(false);
  const { data: session } = useSession();
  const socket = useSocket();

  // Handle socket connection errors
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setSocketError(false);
    };

    const handleDisconnect = () => {
      setSocketError(true);
    };

    const handleError = (error: Error) => {
      console.error('[EVENTS_PAGE] Socket error:', error);
      setSocketError(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
    };
  }, [socket]);

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
    try {
      // Optimistically remove the event from the UI
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error('[EVENTS_PAGE] Current events state is not an array:', prev);
          return [];
        }
        return prev.filter(event => event.id !== eventId);
      });

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
      console.error('[EVENTS_PAGE] Error deleting event:', error);
      toast.error("Failed to delete event");
      // Re-fetch events to ensure consistency
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setEvents(data);
        }
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewEvent = (newEvent: EventWithUser) => {
      if (!newEvent || typeof newEvent !== 'object') {
        console.error('[EVENTS_PAGE] Invalid new event received:', newEvent);
        return;
      }
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error('[EVENTS_PAGE] Current events state is not an array:', prev);
          return [newEvent];
        }
        return [newEvent, ...prev];
      });
    };

    const handleEventDeleted = (eventId: string) => {
      if (!eventId || typeof eventId !== 'string') {
        console.error('[EVENTS_PAGE] Invalid event ID received for deletion:', eventId);
        return;
      }
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error('[EVENTS_PAGE] Current events state is not an array:', prev);
          return [];
        }
        return prev.filter(event => event.id !== eventId);
      });
    };

    const handleEventInterestUpdate = (data: { eventId: string, counts: { interested: number, participants: number } }) => {
      if (!data || !data.eventId || !data.counts) {
        console.error('[EVENTS_PAGE] Invalid interest update data:', data);
        return;
      }
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error('[EVENTS_PAGE] Current events state is not an array:', prev);
          return [];
        }
        return prev.map(event => 
          event.id === data.eventId 
            ? { 
                ...event, 
                _count: { 
                  interested: data.counts.interested, 
                  participants: data.counts.participants 
                } 
              } 
            : event
        );
      });
    };

    const handleEventParticipateUpdate = (data: { eventId: string, counts: { interested: number, participants: number } }) => {
      if (!data || !data.eventId || !data.counts) {
        console.error('[EVENTS_PAGE] Invalid participation update data:', data);
        return;
      }
      setEvents(prev => {
        if (!Array.isArray(prev)) {
          console.error('[EVENTS_PAGE] Current events state is not an array:', prev);
          return [];
        }
        return prev.map(event => 
          event.id === data.eventId 
            ? { 
                ...event, 
                _count: { 
                  interested: data.counts.interested, 
                  participants: data.counts.participants 
                } 
              } 
            : event
        );
      });
    };

    // Subscribe to socket events
    socket.on("newEvent", handleNewEvent);
    socket.on("deleteEvent", handleEventDeleted);
    socket.on("eventInterestUpdate", handleEventInterestUpdate);
    socket.on("eventParticipateUpdate", handleEventParticipateUpdate);

    // Cleanup
    return () => {
      if (socket) {
        socket.off("newEvent", handleNewEvent);
        socket.off("deleteEvent", handleEventDeleted);
        socket.off("eventInterestUpdate", handleEventInterestUpdate);
        socket.off("eventParticipateUpdate", handleEventParticipateUpdate);
      }
    };
  }, [socket]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error('[EVENTS_PAGE] Received non-array data:', data);
          setEvents([]);
          return;
        }
        
        setEvents(data);
      } catch (error) {
        console.error('[EVENTS_PAGE] Error fetching events:', error);
        toast.error("Failed to load events");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <CustomLoader />
        </div>
      </div>
    );
  }

  if (socketError) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="text-center py-8">
          <p className="text-red-500">Connection error. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

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

      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No events found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              status={getStatusText(new Date(event.startDate))}
              onDelete={() => handleDelete(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 