"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { EventWithUser, UserRole, UserStatus } from "@/lib/definitions";
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

type EventStatus = 'ongoing' | 'upcoming' | 'ended';

function getStatusColor(startDate: Date) {
  const now = new Date();
  const eventDate = new Date(startDate);
  const oneDayBefore = new Date(eventDate);
  oneDayBefore.setDate(eventDate.getDate() - 1);
  const oneDayAfter = new Date(eventDate);
  oneDayAfter.setDate(eventDate.getDate() + 1);

  if (now >= oneDayBefore && now <= oneDayAfter) {
    return {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
    };
  } else if (now > oneDayAfter) {
    return {
      bg: "bg-red-500/10",
      text: "text-red-500",
    };
  } else {
    return {
      bg: "bg-green-500/10",
      text: "text-green-500",
    };
  }
}

function getStatusText(startDate: Date): EventStatus {
  const now = new Date();
  const eventDate = new Date(startDate);
  const oneDayBefore = new Date(eventDate);
  oneDayBefore.setDate(eventDate.getDate() - 1);
  const oneDayAfter = new Date(eventDate);
  oneDayAfter.setDate(eventDate.getDate() + 1);

  if (now >= oneDayBefore && now <= oneDayAfter) {
    return "ongoing";
  } else if (now > oneDayAfter) {
    return "ended";
  } else {
    return "upcoming";
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithUser | null>(null);
  const { data: session, status } = useSession();

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
    
    // First sort by status priority (ongoing > upcoming > ended)
    const statusPriority: Record<EventStatus, number> = { ongoing: 0, upcoming: 1, ended: 2 };
    if (statusPriority[aStatus] !== statusPriority[bStatus]) {
      return statusPriority[aStatus] - statusPriority[bStatus];
    }
    
    // Then sort by date within each status
    return aDate.getTime() - bDate.getTime();
  });

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await fetchEvents();
        const typedEvents = data.map(event => ({
          ...event,
          user: {
            ...event.user,
            role: event.user.role as UserRole,
            status: event.user.status as UserStatus
          }
        })) as EventWithUser[];
        setEvents(typedEvents);
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, []);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container max-w-5xl px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
          <CustomLoader size="default" />
        </div>
      </PageLayout>
    );
  }

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
                                  
                                  try {
                                    const response = await fetch(`/api/events?id=${event.id}`, {
                                      method: 'DELETE',
                                    });
                                    
                                    if (!response.ok) throw new Error('Failed to delete event');
                                    
                                    // Refresh the events list
                                    window.location.reload();
                                  } catch (error) {
                                    console.error('Error deleting event:', error);
                                    alert('Failed to delete event');
                                  }
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