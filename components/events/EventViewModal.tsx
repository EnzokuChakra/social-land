import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { CalendarIcon, MapPin, Trophy, X, CalendarDays, Clock, Users, Share2, Heart, UserPlus, Info } from "lucide-react";
import {
  Dialog,
  DialogContentWithoutClose,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateToBucharestWithTime } from "@/lib/utils";
import { EventWithUser } from "@/lib/definitions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import VerifiedBadge from "@/components/VerifiedBadge";

interface EventViewModalProps {
  event: EventWithUser;
  isOpen: boolean;
  onClose: () => void;
  onInterest: () => Promise<void>;
  onParticipate: () => Promise<void>;
  isInterested: boolean;
  isParticipating: boolean;
}

export default function EventViewModal({ 
  event, 
  isOpen, 
  onClose, 
  onInterest, 
  onParticipate, 
  isInterested, 
  isParticipating 
}: EventViewModalProps) {
  const [localEvent, setLocalEvent] = useState<EventWithUser>(event);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const socket = getSocket();

  // Update local event when prop changes
  useEffect(() => {
    setLocalEvent(event);
  }, [event]);

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

  const calculateTotalPrizePool = (prizes: string | null) => {
    if (!prizes) return 0;
    try {
      const prizeArray = JSON.parse(prizes);
      return prizeArray.reduce((total: number, prize: string) => {
        const value = parseFloat(prize.replace(/[^0-9.]/g, ''));
        return total + (isNaN(value) ? 0 : value);
      }, 0);
    } catch {
      const value = parseFloat(prizes.replace(/[^0-9.]/g, ''));
      return isNaN(value) ? 0 : value;
    }
  };

  const totalPrizePool = calculateTotalPrizePool(localEvent.prizes || localEvent.prize);
  
  // Safely parse prizeArray with error handling
  const prizeArray = useMemo(() => {
    try {
      if (localEvent.prizes) {
        const parsed = JSON.parse(localEvent.prizes);
        return Array.isArray(parsed) ? parsed : [];
      }
      if (localEvent.prize) {
        return [localEvent.prize];
      }
      return [];
    } catch (error) {
      console.error("Error parsing prizes:", error);
      return [];
    }
  }, [localEvent.prizes, localEvent.prize]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContentWithoutClose className="max-w-[95vw] sm:max-w-3xl w-full h-[95vh] max-h-[95vh] overflow-y-auto p-0 gap-0 bg-[#000000] border-neutral-800">
        <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-lg">
          <Image
            src={event.photoUrl}
            alt={event.name}
            fill
            className="object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center border border-white/20 hover:border-white/30 transition-all duration-200 group"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 group-hover:text-white transition-colors" />
          </button>
          <div className="absolute top-3 right-14 sm:right-16">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                event.status === "UPCOMING" && "bg-blue-500/30 text-blue-200",
                event.status === "ONGOING" && "bg-green-500/30 text-green-200",
                event.status === "COMPLETED" && "bg-gray-500/30 text-gray-200"
              )}
            >
              {event.status}
            </Badge>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 sm:pb-24">
          <div className="relative">
            <h3 className="text-xl sm:text-2xl font-semibold text-white text-center">{localEvent.name}</h3>
            <div className="absolute top-0 right-0 flex items-center gap-1">
              <span className="text-xs text-neutral-400">by {localEvent.user.username || "Anonymous"}</span>
              {localEvent.user.verified && <VerifiedBadge className="w-3 h-3" />}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 mb-1">
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Status</span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs sm:text-sm font-medium",
                    localEvent.status === "UPCOMING" && "bg-blue-500/30 text-blue-200",
                    localEvent.status === "ONGOING" && "bg-green-500/30 text-green-200",
                    localEvent.status === "COMPLETED" && "bg-gray-500/30 text-gray-200"
                  )}
                >
                  {localEvent.status || "UPCOMING"}
                </Badge>
              </div>

              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 mb-1">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Type</span>
                </div>
                <span className="text-white/90 font-medium text-sm sm:text-base">{localEvent.type}</span>
              </div>

              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 mb-1">
                  <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Date</span>
                </div>
                <span className="text-white/90 font-medium text-sm sm:text-base">{format(new Date(localEvent.startDate), "MMMM d, yyyy")}</span>
              </div>

              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 mb-1">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Time</span>
                </div>
                <span className="text-white/90 font-medium text-sm sm:text-base">{format(new Date(localEvent.startDate), "h:mm a")}</span>
              </div>

              <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Location</span>
                </div>
                <span className="text-white/90 font-medium text-sm sm:text-base">{localEvent.location}</span>
              </div>
            </div>

            {prizeArray.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                  <Trophy className="w-4 h-4" />
                  <span>Prize Pool</span>
                </div>
                <div className={cn(
                  "grid gap-3 sm:gap-4",
                  prizeArray.length === 1 && "grid-cols-1 max-w-md mx-auto",
                  prizeArray.length === 2 && "grid-cols-2 max-w-2xl mx-auto",
                  prizeArray.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {prizeArray.map((prize: string, index: number) => (
                    <div
                      key={index}
                      className="bg-neutral-900/50 rounded-lg p-3 sm:p-4 text-sm flex items-center justify-between border border-neutral-800 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-800 flex items-center justify-center text-primary">
                          #{index + 1}
                        </div>
                        <span className="text-white font-medium">{prize}</span>
                      </div>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 border-t border-neutral-800 pt-3 sm:pt-4">
                  <span className="text-white/90 font-medium">Total Prize Pool</span>
                  <span className="text-amber-400 font-semibold text-base sm:text-lg">
                    {formatCurrency(totalPrizePool)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-400">Description</h4>
              <p className="text-sm text-neutral-200 whitespace-pre-wrap">{localEvent.description}</p>
            </div>

            {localEvent.rules && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-neutral-400">Rules</h4>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{localEvent.rules}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 pt-4 border-t border-neutral-800">
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "flex items-center gap-2 w-full sm:min-w-[180px]",
                  isInterested 
                    ? "bg-pink-500/10 border-pink-500 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300" 
                    : "bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:text-white"
                )}
                onClick={onInterest}
              >
                <Heart className={cn("w-5 h-5", isInterested && "fill-current")} />
                <span>{localEvent._count?.interested || 0} Interested</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "flex items-center gap-2 w-full sm:min-w-[180px]",
                  isParticipating 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" 
                    : "bg-white/5 border-white/10 text-white/90 hover:bg-white/10 hover:text-white"
                )}
                onClick={onParticipate}
              >
                <UserPlus className={cn("w-5 h-5", isParticipating && "fill-current")} />
                <span>{localEvent._count?.participants || 0} Participating</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContentWithoutClose>
    </Dialog>
  );
} 