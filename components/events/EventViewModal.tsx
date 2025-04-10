import { format } from "date-fns";
import Image from "next/image";
import { CalendarIcon, MapPin, Trophy, X, CalendarDays, Clock, Users, Share2, MoreVertical, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContentWithoutClose,
} from "@/components/ui/dialog";
import { formatCurrency, formatDateToBucharestWithTime } from "@/lib/utils";
import { EventWithUser } from "@/lib/definitions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface EventViewModalProps {
  event: EventWithUser;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventViewModal({ event, isOpen, onClose }: EventViewModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isAuthorized = session?.user && (
    session.user.id === event.user_id || 
    ["ADMIN", "MASTER_ADMIN"].includes(session.user.role || "")
  );

  const calculateTotalPrizePool = (prize: string | null) => {
    if (!prize) return 0;
    const numericValue = parseFloat(prize.replace(/[^0-9.]/g, ''));
    return isNaN(numericValue) ? 0 : numericValue;
  };

  const handleDelete = async () => {
    if (!isAuthorized) return;

    try {
      const response = await fetch(`/api/events?id=${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success("Event deleted successfully");
      onClose();
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContentWithoutClose className="max-w-4xl w-[95%] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border-border">
          <div className="relative w-full aspect-[16/9]">
            <Image
              src={event.photoUrl}
              alt={event.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            {/* Header Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white">{event.name}</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-white/90">
                      <CalendarDays className="w-4 h-4" />
                      <span className="text-sm">{formatDateToBucharestWithTime(event.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAuthorized && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 border-primary/20 hover:border-primary/40"
                        >
                          <MoreVertical className="w-4 h-4 text-primary" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem 
                          className="text-red-500 focus:text-red-500 cursor-pointer"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 border-primary/20 hover:border-primary/40"
                    onClick={onClose}
                  >
                    <X className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Organizer Info */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <UserAvatar
                user={{
                  id: event.user.id,
                  image: event.user.image || "/images/profile_placeholder.webp",
                  name: event.user.name || "Anonymous",
                  username: event.user.username || "anonymous",
                }}
                className="h-12 w-12"
              />
              <div>
                <h3 className="font-semibold">Organized by</h3>
                <p className="text-sm text-muted-foreground">@{event.user.username || "Anonymous"}</p>
              </div>
              <Button 
                variant="outline" 
                className="ml-auto border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <Share2 className="w-4 h-4 mr-2 text-primary" />
                Share Event
              </Button>
            </div>

            {/* Prize Pool Section */}
            {event.prize && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Prize Pool</h3>
                </div>
                
                <div className="grid gap-4">
                  {event.prizes ? (
                    JSON.parse(event.prizes).map((prize: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-primary">{formatCurrency(prize)}</p>
                            <p className="text-sm text-muted-foreground">Place {index + 1}</p>
                          </div>
                        </div>
                        <Trophy className="w-5 h-5 text-primary" />
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          #1
                        </div>
                        <div>
                          <p className="font-medium text-primary">{formatCurrency(event.prize)}</p>
                          <p className="text-sm text-muted-foreground">First Place</p>
                        </div>
                      </div>
                      <Trophy className="w-5 h-5 text-primary" />
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="font-medium">Total Prize Pool</span>
                  <span className="text-primary font-semibold">
                    {formatCurrency(calculateTotalPrizePool(event.prizes ? JSON.parse(event.prizes)[0] : event.prize).toString())}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Description Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                About the Event
              </h3>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            </motion.div>

            {/* Rules Section */}
            {event.rules && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Rules & Guidelines
                </h3>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">{event.rules}</p>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex gap-4 pt-4"
            >
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90" 
                size="lg"
              >
                Register Now
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                Add to Calendar
              </Button>
            </motion.div>
          </div>
        </DialogContentWithoutClose>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 