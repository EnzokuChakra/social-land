"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { EventWithUserData } from "@/types/event";
import { fetchEventById } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function EventPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventWithUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const data = await fetchEventById(eventId as string);
        setEvent(data);
      } catch (error) {
        console.error("Error loading event:", error);
        setError("Failed to load event. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    loadEvent();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">Event not found</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <p className="text-gray-600">{event.description}</p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">Date</h3>
              <p>{format(new Date(event.startDate), 'PPP')}</p>
            </div>
            <div>
              <h3 className="font-semibold">Location</h3>
              <p>{event.location}</p>
            </div>
          </div>

          {event.rules && (
            <div>
              <h3 className="font-semibold">Rules</h3>
              <p className="whitespace-pre-wrap">{event.rules}</p>
            </div>
          )}

          {event.prize && (
            <div>
              <h3 className="font-semibold">Prize</h3>
              <p>{event.prize}</p>
            </div>
          )}

          {event.photoUrl && (
            <div className="aspect-video relative rounded-lg overflow-hidden">
              <img 
                src={event.photoUrl} 
                alt={event.name}
                className="object-cover w-full h-full"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 