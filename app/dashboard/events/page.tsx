"use client";

import { useEffect, useState } from "react";
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
  isTodayInBucharest, 
  isPastInBucharest, 
  isFutureInBucharest, 
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
  if (isTodayInBucharest(startDate)) {
    return {
      bg: "bg-green-500",
      text: "text-white",
    };
  } else if (isPastInBucharest(startDate)) {
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
  if (isTodayInBucharest(startDate)) {
    return "ONGOING";
  } else if (isPastInBucharest(startDate)) {
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
  const { data: session } = useSession();
  const socket = useSocket();

  const filterEvents = (events: EventWithUser[]) => {
    return events.filter((event) => {
      const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  };

  const sortedEvents = filterEvents(events).sort((a: EventWithUser, b: EventWithUser) => {
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        if (!response.ok) throw new Error("Failed to fetch events");
        const data = await response.json();
        // Add prizes field if missing
        const eventsWithPrizes = data.map((event: EventWithUser) => ({
          ...event,
          prizes: event.prizes || null
        }));
        setEvents(eventsWithPrizes);
      } catch (error) {
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Handle new event
    const handleNewEvent = (newEvent: EventWithUser) => {
      setEvents(prev => {
        // Check if event already exists to avoid duplicates
        if (prev.some(event => event.id === newEvent.id)) {
          return prev;
        }
        return [newEvent, ...prev];
      });
      toast.success("New event created!");
    };

    // Handle event deletion
    const handleEventDeleted = (eventId: string) => {
      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast.success("Event deleted successfully");
    };

    // Subscribe to socket events
    socket.on("newEvent", handleNewEvent);
    socket.on("deleteEvent", handleEventDeleted);

    // Cleanup
    return () => {
      socket.off("newEvent", handleNewEvent);
      socket.off("deleteEvent", handleEventDeleted);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex flex-col max-w-[935px] mx-auto pt-4 md:pt-8 gap-8">
        <div className="flex-grow max-w-[630px] w-full mx-auto md:mx-0">
          <CustomLoader size="default" />
        </div>
      </div>
    );
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    // Optimistically update the UI
    const previousEvents = [...events];
    setEvents(prev => prev.filter(event => event.id !== eventId));

    try {
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If the request fails, revert the optimistic update
        setEvents(previousEvents);
        throw new Error(data.error || "Failed to delete event");
      }

      // Show success message
      toast.success("Event deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event");
    }
  };

  const handleCreateEvent = async (formData: FormData) => {
    // Create a temporary event object for optimistic update
    const tempEvent: EventWithUser = {
      id: 'temp-' + Date.now(), // Temporary ID
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      rules: formData.get('rules') as string,
      prize: formData.get('prize') as string,
      location: formData.get('location') as string,
      startDate: new Date(formData.get('startDate') as string),
      photoUrl: '/placeholder.jpg', // Temporary placeholder
      user_id: session?.user?.id || '',
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
    };

    // Optimistically update the UI
    setEvents(prev => [tempEvent, ...prev]);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // If the request fails, remove the temporary event
        setEvents(prev => prev.filter(event => event.id !== tempEvent.id));
        throw new Error(data.error || "Failed to create event");
      }

      // Replace the temporary event with the real one
      setEvents(prev => prev.map(event => 
        event.id === tempEvent.id ? data : event
      ));

      toast.success("Event created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create event");
    }
  };

  return (
    <div className="flex flex-col max-w-[935px] mx-auto pt-4 md:pt-8 gap-8">
      <div className="flex-grow max-w-[935px] w-full mx-auto md:mx-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] max-w-[400px]">
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <CreateEventButton />
          </div>

          {sortedEvents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4"
            >
              {sortedEvents.map((event) => (
                <motion.div key={event.id} variants={item}>
                  <EventCard 
                    event={event} 
                    status={getStatusText(new Date(event.startDate))} 
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      {selectedEvent && (
        <EventViewModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
} 