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
          className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/50 mt-8 bg-card/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(true)}
        >
          <div className="relative h-56">
            <Image
              src={event.photoUrl}
              alt={event.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-90" />
            <Badge className={`absolute top-3 right-3 ${statusColor} backdrop-blur-sm`}>
              {status}
            </Badge>

            {/* Three dots menu */}
            <div className="absolute top-3 left-3 z-[100]">
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold mb-3 line-clamp-1 group-hover:text-primary transition-colors">
              {event.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
              {event.description}
            </p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span>{formatDateSafely(startDate, "PPP")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span>{formatDateSafely(startDate, "HH:mm")} - {formatDateSafely(endDate, "HH:mm")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="line-clamp-1">{event.location}</span>
              </div>
              {validPrizes.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Prize Pool</span>
                    <div className="flex flex-wrap gap-2">
                      {validPrizes.map((prize: string | number, index: number) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {formatCurrency(prize)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="p-6 border-t bg-muted/30">
            <div className="flex items-center gap-3">
              <UserAvatar
                user={{
                  id: event.user.id,
                  image: event.user.image,
                  name: event.user.name,
                  username: event.user.username,
                }}
                className="h-10 w-10"
              />
              <div>
                <p className="font-semibold">{event.user.name}</p>
                <p className="text-sm text-muted-foreground">@{event.user.username}</p>
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
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <Image
                src={event.photoUrl}
                alt={event.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <Badge className={`absolute top-4 right-4 ${statusColor} backdrop-blur-sm`}>
                {status}
              </Badge>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
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
                    <div className="p-3 rounded-lg bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{event.location}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {validPrizes.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium mb-2">Prize Pool</p>
                        <div className="flex flex-wrap gap-2">
                          {validPrizes.map((prize: string | number, index: number) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="bg-primary/10 text-primary hover:bg-primary/20 text-base px-4 py-1"
                            >
                              {formatCurrency(prize)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>

              {event.rules && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Rules</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{event.rules}</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 