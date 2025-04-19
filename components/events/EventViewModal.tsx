import { useState, useEffect } from "react";
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
import { useSocket } from "@/hooks/use-socket";

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
  const socket = useSocket();

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
  const prizeArray = localEvent.prizes ? JSON.parse(localEvent.prizes) : (localEvent.prize ? [localEvent.prize] : []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContentWithoutClose className="max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-[#000000] border-neutral-800">
        <div className="relative h-64 w-full overflow-hidden rounded-lg">
          <Image
            src={event.photoUrl}
            alt={event.name}
            fill
            className="object-cover"
          />
          <div className="absolute top-4 right-4">
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
        <div className="p-6 space-y-6">
          <div className="relative">
            <h3 className="text-2xl font-semibold text-white text-center">{localEvent.name}</h3>
            <p className="absolute top-0 right-0 text-xs text-neutral-400">by {localEvent.user.username || "Anonymous"}</p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-8 text-sm text-neutral-400">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-medium",
                      localEvent.status === "UPCOMING" && "bg-blue-500/30 text-blue-200",
                      localEvent.status === "ONGOING" && "bg-green-500/30 text-green-200",
                      localEvent.status === "COMPLETED" && "bg-gray-500/30 text-gray-200"
                    )}
                  >
                    {localEvent.status || "UPCOMING"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors">
                  <CalendarDays className="w-4 h-4 text-white/80" />
                  <span className="text-white/90">{format(new Date(localEvent.startDate), "MMM d")}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors">
                  <Clock className="w-4 h-4 text-white/80" />
                  <span className="text-white/90">{format(new Date(localEvent.startDate), "HH:mm")}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors">
                  <MapPin className="w-4 h-4 text-white/80" />
                  <span className="text-white/90">{localEvent.location}</span>
                </div>
              </div>
            </div>

            {prizeArray.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                  <Trophy className="w-4 h-4" />
                  <span>Prize Pool</span>
                </div>
                <div className={cn(
                  "grid gap-4",
                  prizeArray.length === 1 && "grid-cols-1 max-w-md mx-auto",
                  prizeArray.length === 2 && "grid-cols-2 max-w-2xl mx-auto",
                  prizeArray.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {prizeArray.map((prize: string, index: number) => (
                    <div
                      key={index}
                      className="bg-neutral-900/50 rounded-lg p-4 text-sm flex items-center justify-between border border-neutral-800 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-primary">
                          #{index + 1}
                        </div>
                        <span className="text-white font-medium">{formatCurrency(parseFloat(prize.replace(/[^0-9.]/g, '')))}</span>
                      </div>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 mt-4 pt-4 border-t border-neutral-800">
                  <span className="text-white/90 font-medium">Total Prize</span>
                  <span className="text-amber-400 font-semibold text-lg">
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

            <div className="flex items-center justify-center gap-6 pt-4 border-t border-neutral-800">
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "flex items-center gap-2 min-w-[180px]",
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
                  "flex items-center gap-2 min-w-[180px]",
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