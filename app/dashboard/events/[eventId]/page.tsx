import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { format } from "date-fns";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPin, Trophy } from "lucide-react";
import { EventWithUser, UserRole, UserStatus } from "@/lib/definitions";

interface EventPageProps {
  params: {
    eventId: string;
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const session = await getServerSession(authOptions);

  if (!db) {
    throw new Error("Database connection not available");
  }

  const event = await db.event.findUnique({
    where: { id: params.eventId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          verified: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const eventWithUser = {
    ...event,
    user: {
      ...event.user,
      role: event.user.role as UserRole,
      status: event.user.status as UserStatus,
    },
  };

  // Parse prizes from either prizes field or use single prize
  const parsedPrizes = eventWithUser.prizes 
    ? JSON.parse(eventWithUser.prizes)
    : (eventWithUser.prize ? [eventWithUser.prize] : null);

  const totalPrizePool = parsedPrizes ? parsedPrizes.reduce((total: number, prize: string) => {
    const numericValue = parseFloat(prize.replace(/[^0-9.]/g, ''));
    return total + (isNaN(numericValue) ? 0 : numericValue);
  }, 0) : 0;

  return (
    <div className="container max-w-4xl py-8">
      <div className="bg-neutral-900 rounded-lg overflow-hidden">
        <div className="relative w-full aspect-video">
          <Image
            src={eventWithUser.photoUrl}
            alt={eventWithUser.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{eventWithUser.name}</h1>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-sm">
              {eventWithUser.type}
            </span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>{format(new Date(eventWithUser.startDate), "PPP")}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{eventWithUser.location}</span>
            </div>
            {parsedPrizes && parsedPrizes.length > 0 && (
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span>{parsedPrizes[0]}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {parsedPrizes && parsedPrizes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Prizes</h3>
                <div className="grid gap-4">
                  {parsedPrizes.map((prize: string, index: number) => (
                    <div key={index} className="bg-neutral-900/50 rounded-lg p-4 flex items-center justify-between border border-neutral-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-primary">
                          #{index + 1}
                        </div>
                        <span className="text-white font-medium">{prize}</span>
                      </div>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-neutral-400 mt-2 flex items-center justify-between border-t border-neutral-800 pt-4">
                  <span>Total Prize Pool</span>
                  <span className="text-primary font-semibold">
                    ${totalPrizePool.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
              <p className="text-neutral-400 whitespace-pre-wrap">{eventWithUser.description}</p>
            </div>

            {eventWithUser.rules && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Rules</h2>
                <p className="text-neutral-400 whitespace-pre-wrap">{eventWithUser.rules}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <div className="relative h-10 w-10 rounded-full overflow-hidden">
                <Image
                  src={eventWithUser.user.image || "/images/profile_placeholder.webp"}
                  alt={eventWithUser.user.username || "User"}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-white font-medium">{eventWithUser.user.name}</p>
                <p className="text-sm text-neutral-400">@{eventWithUser.user.username || "user"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 