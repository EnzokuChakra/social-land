import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPin, Trophy } from "lucide-react";

interface EventPageProps {
  params: {
    eventId: string;
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return notFound();
  }

  const event = await db.event.findUnique({
    where: {
      id: params.eventId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!event) {
    return notFound();
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="bg-black rounded-lg overflow-hidden border border-neutral-800">
        <div className="relative h-[400px] w-full">
          <Image
            src={event.photoUrl}
            alt={event.name}
            fill
            className="object-cover"
          />
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{event.name}</h1>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-sm">
              {event.type}
            </span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>{format(new Date(event.startDate), "PPP")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
            {event.prize && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>{event.prize}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
              <p className="text-neutral-400 whitespace-pre-wrap">{event.description}</p>
            </div>

            {event.rules && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Rules</h2>
                <p className="text-neutral-400 whitespace-pre-wrap">{event.rules}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <div className="relative h-10 w-10 rounded-full overflow-hidden">
                <Image
                  src={event.user.image || "/images/profile_placeholder.webp"}
                  alt={event.user.username || "User"}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-white font-medium">{event.user.name}</p>
                <p className="text-sm text-neutral-400">@{event.user.username || "user"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 