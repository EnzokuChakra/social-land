"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  description: string;
  image: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  isAttending: boolean;
}

const dummyEvents: Event[] = [
  {
    id: "1",
    title: "Summer Music Festival",
    description: "A day of amazing music performances from local and international artists.",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1000&auto=format&fit=crop",
    date: "2024-07-15",
    time: "2:00 PM",
    location: "Central Park",
    attendees: 245,
    maxAttendees: 500,
    category: "Music",
    isAttending: false,
  },
  {
    id: "2",
    title: "Tech Meetup",
    description: "Join us for an evening of networking and tech talks from industry experts.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
    date: "2024-07-20",
    time: "6:00 PM",
    location: "Tech Hub",
    attendees: 89,
    maxAttendees: 100,
    category: "Business",
    isAttending: true,
  },
  {
    id: "3",
    title: "Food & Wine Festival",
    description: "Experience the finest local cuisine and wine tasting from top restaurants.",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1000&auto=format&fit=crop",
    date: "2024-07-25",
    time: "12:00 PM",
    location: "Downtown Square",
    attendees: 156,
    maxAttendees: 200,
    category: "Food",
    isAttending: false,
  },
  {
    id: "4",
    title: "Art Exhibition",
    description: "Contemporary art showcase featuring works from emerging artists.",
    image: "https://images.unsplash.com/photo-1531913764164-f152c22e8c38?q=80&w=1000&auto=format&fit=crop",
    date: "2024-08-01",
    time: "10:00 AM",
    location: "Modern Art Gallery",
    attendees: 78,
    maxAttendees: 150,
    category: "Art",
    isAttending: false,
  },
];

export default function EventsGrid() {
  const [events, setEvents] = useState<Event[]>(dummyEvents);

  const toggleAttendance = (eventId: string) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, isAttending: !event.isAttending, attendees: event.isAttending ? event.attendees - 1 : event.attendees + 1 }
        : event
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          <div className="relative h-48">
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-4 right-4">
              <span className="bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {event.category}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
              {event.description}
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Clock className="w-4 h-4" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Users className="w-4 h-4" />
                <span>{event.attendees}/{event.maxAttendees} attendees</span>
              </div>
            </div>

            <Button
              onClick={() => toggleAttendance(event.id)}
              className={cn(
                "w-full",
                event.isAttending && "bg-red-500 hover:bg-red-600"
              )}
            >
              {event.isAttending ? "Cancel RSVP" : "RSVP"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
} 