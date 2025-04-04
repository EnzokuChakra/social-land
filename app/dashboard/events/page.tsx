"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import { Event, EventWithUser, UserRole, UserStatus, EventStatus } from "@/lib/definitions";
import { fetchEvents } from "@/lib/actions";
import { CalendarDays, Search, Filter, CalendarClock, Trophy, MoreVertical, Trash2, Edit, Eye } from "lucide-react";
import CreateEventButton from "@/components/events/CreateEventButton";
import EventViewModal from "@/components/events/EventViewModal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isPast, isFuture } from "date-fns";
import PageLayout from "@/components/PageLayout";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { CustomLoader } from "@/components/ui/custom-loader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const eventTypes = [
  "All Types",
  "Social",
  "Sports",
  "Education",
  "Music",
  "Art",
  "Food",
  "Business",
];

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
  if (isToday(startDate)) {
    return {
      bg: "bg-green-500/10",
      text: "text-green-500",
    };
  } else if (isPast(startDate)) {
    return {
      bg: "bg-gray-500/10",
      text: "text-gray-500",
    };
  } else {
    return {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
    };
  }
}

function getStatusText(startDate: Date): EventStatus {
  if (isToday(startDate)) {
    return "ONGOING";
  } else if (isPast(startDate)) {
    return "ENDED";
  } else {
    return "UPCOMING";
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithUser | null>(null);
  const { data: session } = useSession();
  const socket = useSocket();

  const filterEvents = (events: EventWithUser[]) => {
    return events.filter((event) => {
      const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "All Types" || event.type === selectedType;
      return matchesSearch && matchesType;
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
        setEvents(data);
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
      setEvents(prev => [newEvent, ...prev]);
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
      <PageLayout>
        <div className="container max-w-5xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
          <CustomLoader size="default" />
        </div>
      </PageLayout>
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
    <PageLayout>
      <div className="mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container max-w-5xl py-10 space-y-8 bg-white dark:bg-black"
          suppressHydrationWarning
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" suppressHydrationWarning>
            <div className="flex items-center gap-3" suppressHydrationWarning>
              <div className="p-2 rounded-xl bg-primary/10" suppressHydrationWarning>
                <CalendarDays className="w-8 h-8 text-primary" />
              </div>
              <div suppressHydrationWarning>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Events
                </h1>
                <p className="text-muted-foreground">Discover and join amazing events</p>
              </div>
            </div>
            {session?.user?.verified && (
              <CreateEventButton />
            )}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4" suppressHydrationWarning>
            <div className="relative flex-1" suppressHydrationWarning>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Events Timeline */}
          {sortedEvents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
              suppressHydrationWarning
            >
              <CalendarClock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </motion.div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              suppressHydrationWarning
            >
              {sortedEvents.map((event: EventWithUser) => {
                const { bg, text } = getStatusColor(new Date(event.startDate));
                const statusText = getStatusText(new Date(event.startDate));
                const prizeAmount = event.prize ? parseFloat(event.prize.replace(/[^0-9.]/g, '')) : 0;

                return (
                  <motion.div
                    key={event.id}
                    variants={item}
                    className="group cursor-pointer relative"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="relative h-48 rounded-xl overflow-hidden bg-neutral-900">
                      <Image
                        src={event.photoUrl}
                        alt={event.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Action buttons - Only show for authorized users */}
                      {(session?.user?.role === "MASTER_ADMIN" || 
                        session?.user?.role === "ADMIN" || 
                        session?.user?.id === event.user_id) && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white/90 hover:bg-white dark:bg-black/90 dark:hover:bg-black"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500 cursor-pointer"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm('Are you sure you want to delete this event?')) return;
                                  await handleDeleteEvent(event.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Event
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${bg} ${text}`}>
                            {statusText}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <CalendarDays className="w-4 h-4" />
                          <span>{format(new Date(event.startDate), "PPP")}</span>
                        </div>
                        {event.prize && (
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm font-medium text-white">
                                {formatCurrency(event.prize)}
                              </span>
                            </div>
                            <span className="text-xs text-white/60">
                              Total: {formatCurrency(prizeAmount.toString())}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>

      {selectedEvent && (
        <EventViewModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </PageLayout>
  );
} 