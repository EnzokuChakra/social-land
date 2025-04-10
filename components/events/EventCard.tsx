"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { MapPin, Calendar, Trophy, User, Users, Clock, MoreVertical, Trash2 } from "lucide-react";
import { EventWithUser, EventStatus } from "@/lib/definitions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import UserAvatar from "@/components/UserAvatar";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface EventCardProps {
  event: EventWithUser;
  status: EventStatus;
}

export default function EventCard({ event, status }: EventCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Parse prizes from JSON string or use single prize
  const prizes = event.prizes 
    ? (typeof event.prizes === 'string' ? JSON.parse(event.prizes) : event.prizes) 
    : (event.prize ? [event.prize] : []);

  // Ensure all prizes are valid numbers
  const validPrizes = prizes.filter((prize: string | number) => {
    if (!prize) return false;
    const numericValue = typeof prize === 'string' ? prize.replace(/[^0-9.]/g, '') : prize.toString();
    return !isNaN(parseFloat(numericValue));
  });

  // Parse and validate the start date
  const parseAndValidateDate = (dateStr: string | Date): Date | null => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  };

  const startDate = parseAndValidateDate(event.startDate);
  if (!startDate) {
    console.error('Invalid start date:', event.startDate);
    return null;
  }

  const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

  // Format dates safely with validation
  const formatDateSafely = (date: Date | null, formatString: string): string => {
    if (!date) return 'Invalid date';
    try {
      return format(date, formatString);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const statusColor = {
    UPCOMING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    ONGOING: "bg-green-500/10 text-green-500 border-green-500/20",
    ENDED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  }[status];

  const isAuthorized = Boolean(
    sessionStatus === "authenticated" &&
    session?.user &&
    (
      session.user.id === event.user_id || 
      ["ADMIN", "MASTER_ADMIN"].includes(session.user.role || "")
    )
  );

  const handleDelete = async () => {
    if (!isAuthorized) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/events?id=${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success("Event deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <Card 
          className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-primary/50 mt-8"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="relative h-48">
            <Image
              src={event.photoUrl}
              alt={event.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <Badge className={`absolute top-3 right-3 ${statusColor}`}>
              {status}
            </Badge>

            {/* Three dots menu */}
            <div className="absolute top-3 left-3 z-[100]">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <CardContent className="p-4">
            <h3 className="text-xl font-semibold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
              {event.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {event.description}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{formatDateSafely(startDate, "PPP")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{formatDateSafely(startDate, "HH:mm")} - {formatDateSafely(endDate, "HH:mm")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
              {validPrizes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <div className="flex flex-col">
                    {validPrizes.map((prize: string | number, index: number) => (
                      <span key={index} className="text-sm text-muted-foreground">
                        {formatCurrency(prize)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="p-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <UserAvatar
                user={{
                  id: event.user.id,
                  image: event.user.image,
                  name: event.user.name,
                  username: event.user.username,
                }}
              />
              <div>
                <p className="font-medium">{event.user.name}</p>
                <p className="text-muted-foreground">@{event.user.username}</p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{event.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Organized by {event.user.name} (@{event.user.username})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="relative h-[300px] rounded-lg overflow-hidden">
              <Image
                src={event.photoUrl}
                alt={event.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <Badge className={`absolute top-4 right-4 ${statusColor}`}>
                {status}
              </Badge>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {formatDateSafely(startDate, "PPP")}
                      <br />
                      {formatDateSafely(startDate, "HH:mm")} - {formatDateSafely(endDate, "HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">{event.location}</p>
                  </div>
                </div>

                {validPrizes.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Prizes</p>
                      <div className="space-y-1">
                        {validPrizes.map((prize: string | number, index: number) => (
                          <p key={index} className="text-muted-foreground">
                            {formatCurrency(prize)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Event Type</p>
                    <p className="text-muted-foreground">{event.type}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>

                {event.rules && (
                  <div>
                    <h4 className="font-medium mb-2">Rules</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {event.rules}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UserAvatar
                user={{
                  id: event.user.id,
                  image: event.user.image,
                  name: event.user.name,
                  username: event.user.username,
                }}
                className="w-10 h-10"
              />
              <div>
                <p className="font-medium">{event.user.name}</p>
                <p className="text-sm text-muted-foreground">@{event.user.username}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 