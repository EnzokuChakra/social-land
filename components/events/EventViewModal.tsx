import { format } from "date-fns";
import Image from "next/image";
import { CalendarIcon, MapPin, Trophy, X, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface EventViewModalProps {
  event: {
    id: string;
    name: string;
    type: string;
    description: string;
    rules?: string;
    prizes?: string[] | null;
    location: string;
    startDate: Date;
    photoUrl: string;
    user: {
      id: string;
      username: string;
      name: string;
      image: string | null;
    };
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EventViewModal({ event, isOpen, onClose }: EventViewModalProps) {
  const calculateTotalPrizePool = (prizes: string[] | null) => {
    if (!prizes || prizes.length === 0) return 0;
    return prizes.reduce((sum, prize) => {
      const numericValue = parseFloat(prize.replace(/[^0-9.]/g, ''));
      return sum + (isNaN(numericValue) ? 0 : numericValue);
    }, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-[#000000] border-neutral-800">
        <div className="relative w-full aspect-video">
          <Image
            src={event.photoUrl}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 rounded-full overflow-hidden">
              <Image
                src={event.user.image || "/images/profile_placeholder.webp"}
                alt={event.user.username || "User"}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{event.name}</h3>
              <p className="text-sm text-neutral-400">by {event.user.username}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <CalendarDays className="w-4 h-4" />
                <span>{format(new Date(event.startDate), "MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            </div>

            {event.prizes && event.prizes.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Trophy className="w-4 h-4" />
                  <span>Prize Pool</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.prizes.map((prize, index) => (
                    <div
                      key={index}
                      className="bg-neutral-900/50 rounded-lg p-4 text-sm flex items-center justify-between border border-neutral-800 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-primary">
                          #{index + 1}
                        </div>
                        <span className="text-white font-medium">{formatCurrency(prize)}</span>
                      </div>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-neutral-400 mt-2 flex items-center justify-between border-t border-neutral-800 pt-4">
                  <span>Total Prize Pool</span>
                  <span className="text-primary font-semibold">
                    {formatCurrency(calculateTotalPrizePool(event.prizes).toString())}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-neutral-400">Description</h4>
              <p className="text-sm text-neutral-200 whitespace-pre-wrap">{event.description}</p>
            </div>

            {event.rules && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-neutral-400">Rules</h4>
                <p className="text-sm text-neutral-200 whitespace-pre-wrap">{event.rules}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 