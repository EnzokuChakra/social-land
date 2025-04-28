"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { MapPin, Calendar, Trophy, User, Users, Clock, MoreVertical, Trash2, Heart, UserPlus } from "lucide-react";
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
import EventViewModal from "./EventViewModal";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import _ from "lodash";

interface EventCardProps {
  event: EventWithUser;
  status: EventStatus;
  onDelete?: (eventId: string) => Promise<void>;
}

export default function EventCard({ event, status, onDelete }: EventCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localEvent, setLocalEvent] = useState<EventWithUser>({
    ...event,
    user: {
      id: event.user?.id || '',
      username: event.user?.username || 'user',
      name: event.user?.name || 'User',
      image: event.user?.image || '/images/profile_placeholder.webp',
      verified: event.user?.verified || false,
      role: event.user?.role || 'USER',
      status: event.user?.status || 'ACTIVE'
    }
  });
  const [isInterested, setIsInterested] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const socket = getSocket();

  // Parse prizes from JSON string or use single prize
  const prizes = useMemo(() => {
    try {
      if (localEvent.prizes) {
        const parsedPrizes = typeof localEvent.prizes === 'string' 
          ? JSON.parse(localEvent.prizes) 
          : localEvent.prizes;
        return Array.isArray(parsedPrizes) ? parsedPrizes : [];
      }
      if (localEvent.prize) {
        return [localEvent.prize];
      }
      return [];
    } catch (error) {
      return [];
    }
  }, [localEvent.prizes, localEvent.prize]);

  // Ensure all prizes are valid numbers and handle edge cases
  const validPrizes = useMemo(() => {
    return prizes.filter((prize: string | number) => {
      if (!prize) return false;
      try {
        const numericValue = typeof prize === 'string' 
          ? prize.replace(/[^0-9.]/g, '') 
          : prize.toString();
        return !isNaN(parseFloat(numericValue)) && parseFloat(numericValue) > 0;
      } catch (error) {
        return false;
      }
    });
  }, [prizes]);

  // Calculate total prize pool with better error handling
  const totalPrizePool = useMemo(() => {
    try {
      const total = validPrizes.reduce((total, prize) => {
        const value = typeof prize === 'string' 
          ? parseFloat(prize.replace(/[^0-9.]/g, '')) 
          : parseFloat(prize.toString());
        return total + (isNaN(value) ? 0 : value);
      }, 0);
      return total;
    } catch (error) {
      return 0;
    }
  }, [validPrizes]);

  // Parse and validate the start date
  const parseAndValidateDate = (dateStr: string | Date): Date | null => {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  };

  const startDate = parseAndValidateDate(localEvent.startDate);
  if (!startDate) {
    return null;
  }

  const endDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));

  // Format dates safely with validation
  const formatDateSafely = (date: Date | null, formatString: string): string => {
    if (!date) return 'Invalid date';
    try {
      return format(date, formatString);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const statusColor = {
    UPCOMING: "bg-blue-600 text-white border-blue-700 shadow-lg",
    ONGOING: "bg-green-600 text-white border-green-700 shadow-lg",
    ENDED: "bg-gray-600 text-white border-gray-700 shadow-lg",
  }[status];

  const isAuthorized = Boolean(
    sessionStatus === "authenticated" &&
    session?.user &&
    (
      session.user.id === localEvent.user_id || 
      ["ADMIN", "MASTER_ADMIN"].includes(session.user.role || "")
    )
  );

  const handleDelete = async () => {
    if (!isAuthorized || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(localEvent.id);
    } catch (error) {
      toast.error("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInterest = async () => {
    if (sessionStatus !== "authenticated") {
      toast.error("Please sign in to show interest");
      return;
    }

    try {
      // Optimistically update UI
      const wasInterested = isInterested;
      setIsInterested(!wasInterested);
      setLocalEvent(prev => ({
        ...prev,
        _count: {
          ...prev._count,
          interested: (prev._count?.interested || 0) + (wasInterested ? -1 : 1),
          participants: prev._count?.participants || 0
        }
      }));

      const response = await fetch('/api/events/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: localEvent.id }),
      });
      
      if (!response.ok) throw new Error('Failed to update interest');
      
      const data = await response.json();
      
      // Update with actual server data
      setLocalEvent(prev => ({
        ...prev,
        _count: {
          interested: data.counts.interested,
          participants: data.counts.participants
        }
      }));
      
      toast.success(data.isInterested ? 'Added to interested' : 'Removed from interested');
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("eventInterestUpdate", {
          eventId: localEvent.id,
          counts: data.counts
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsInterested(isInterested);
      setLocalEvent(event);
      toast.error('Failed to update interest');
    }
  };

  const handleParticipate = async () => {
    if (sessionStatus !== "authenticated") {
      toast.error("Please sign in to participate");
      return;
    }

    try {
      // Optimistically update UI
      const wasParticipating = isParticipating;
      setIsParticipating(!wasParticipating);
      setLocalEvent(prev => ({
        ...prev,
        _count: {
          ...prev._count,
          participants: (prev._count?.participants || 0) + (wasParticipating ? -1 : 1),
          interested: prev._count?.interested || 0
        }
      }));

      const response = await fetch('/api/events/participate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: localEvent.id }),
      });
      
      if (!response.ok) throw new Error('Failed to update participation');
      
      const data = await response.json();
      
      // Update with actual server data
      setLocalEvent(prev => ({
        ...prev,
        _count: {
          interested: data.counts.interested,
          participants: data.counts.participants
        }
      }));
      
      toast.success(data.isParticipating ? 'You are now participating' : 'You are no longer participating');
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit("eventParticipateUpdate", {
          eventId: localEvent.id,
          counts: data.counts
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsParticipating(isParticipating);
      setLocalEvent(event);
      toast.error('Failed to update participation');
    }
  };

  // Check if user is interested or participating when component mounts
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      const checkUserStatus = async () => {
        try {
          const response = await fetch(`/api/events/user-status?eventId=${localEvent.id}`, {
            method: 'GET',
          });
          
          if (response.ok) {
            const data = await response.json();
            setIsInterested(data.isInterested);
            setIsParticipating(data.isParticipating);
          }
        } catch (error) {
          console.error("Failed to check user status:", error);
        }
      };
      
      checkUserStatus();
    }
  }, [sessionStatus, session, localEvent.id]);

  // Listen for socket updates
  useEffect(() => {
    if (!socket) return;

    const handleInterestUpdate = (data: { eventId: string, counts: { interested: number, participants: number } }) => {
      if (data.eventId === localEvent.id) {
        setLocalEvent(prev => ({
          ...prev,
          _count: {
            ...prev._count,
            interested: data.counts.interested,
            participants: data.counts.participants
          }
        }));
      }
    };

    const handleParticipateUpdate = (data: { eventId: string, counts: { interested: number, participants: number } }) => {
      if (data.eventId === localEvent.id) {
        setLocalEvent(prev => ({
          ...prev,
          _count: {
            ...prev._count,
            interested: data.counts.interested,
            participants: data.counts.participants
          }
        }));
      }
    };

    socket.on("eventInterestUpdate", handleInterestUpdate);
    socket.on("eventParticipateUpdate", handleParticipateUpdate);

    return () => {
      socket.off("eventInterestUpdate", handleInterestUpdate);
      socket.off("eventParticipateUpdate", handleParticipateUpdate);
    };
  }, [socket, localEvent.id]);

  if (!localEvent) return null;

  return (
    <div className="relative">
      <Card 
        className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/50"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative h-80">
          <Image
            src={localEvent.photoUrl || '/images/profile_placeholder.webp'}
            alt={localEvent.name}
            fill
            className="object-cover transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/profile_placeholder.webp';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
          
          {/* Status Badge */}
          <Badge className={`absolute top-4 right-4 ${statusColor} px-4 py-1.5 font-medium text-sm tracking-wide`}>
            {status}
          </Badge>

          {/* Delete Menu */}
          {isAuthorized && (
            <div className="absolute top-4 left-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-sm dark:bg-background/50 dark:hover:bg-background/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-50">
                  <DropdownMenuItem
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 focus:text-red-600 focus:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Event Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-5">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white drop-shadow-lg line-clamp-1 group-hover:text-primary transition-colors">
                {localEvent.name}
              </h3>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-white px-4 py-2 rounded-full border border-white/40 hover:border-white/60 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">{formatDateSafely(startDate, "MMM d")} • {formatDateSafely(startDate, "HH:mm")}</span>
                </div>
                {totalPrizePool > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-100 px-4 py-2 rounded-full border border-amber-500/40 hover:border-amber-500/60 transition-colors">
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">{formatCurrency(totalPrizePool)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-pink-100 px-4 py-2 rounded-full border border-pink-500/40 hover:border-pink-500/60 transition-colors">
                  <Heart className="w-4 h-4" />
                  <span className="font-medium">{localEvent._count?.interested || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-100 px-4 py-2 rounded-full border border-emerald-500/40 hover:border-emerald-500/60 transition-colors">
                  <UserPlus className="w-4 h-4" />
                  <span className="font-medium">{localEvent._count?.participants || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <EventViewModal
        event={localEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInterest={handleInterest}
        onParticipate={handleParticipate}
        isInterested={isInterested}
        isParticipating={isParticipating}
      />
    </div>
  );
} 