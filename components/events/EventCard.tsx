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

interface EventCardProps {
  event: EventWithUser;
  status: EventStatus;
}

export default function EventCard({ event, status }: EventCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Simple mount test
  useEffect(() => {
    alert(`Component mounted!
Event name: ${event.name}
Session status: ${sessionStatus}
User email: ${session?.user?.email || 'No email'}`);
  }, []); // Empty deps array so it only runs once on mount

  // Debug session state with more prominent logging
  useEffect(() => {
    console.log('========================');
    console.log('🔍 EVENT CARD DEBUG INFO');
    console.log('========================');
    console.log('Session Status:', sessionStatus);
    console.log('Session Data:', session);
    console.log('User Role:', session?.user?.role);
    console.log('User ID:', session?.user?.id);
    console.log('Event Creator ID:', event.user_id);
    console.log('========================');
  }, [session, sessionStatus, event]);

  // Add a simple test button at the top of the card
  const testSession = () => {
    alert(`
      Session Test:
      Status: ${sessionStatus}
      User: ${session?.user?.email || 'No user'}
      Role: ${session?.user?.role || 'No role'}
    `);
  };

  const endDate = new Date(event.startDate.getTime() + (3 * 60 * 60 * 1000));
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
    if (!isAuthorized) {
      console.log('[EventCard] Delete attempted without authorization');
      return;
    }

    try {
      setIsDeleting(true);
      console.log('[EventCard] Deleting event:', event.id);
      const response = await fetch(`/api/events?id=${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      toast.success("Event deleted successfully");
      router.refresh();
    } catch (error) {
      console.error("[EventCard] Error deleting event:", error);
      toast.error("Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Test banner with !important styles */}
      <div 
        style={{
          all: 'revert',
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          backgroundColor: '#ff0000',
          color: '#ffffff',
          padding: '20px',
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          zIndex: '2147483647',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          margin: '0',
          border: 'none',
          textAlign: 'left',
          lineHeight: '1.5',
          pointerEvents: 'auto',
          visibility: 'visible',
          opacity: '1'
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>🔍 Session Debug Info</div>
        <div>Status: {sessionStatus}</div>
        <div>Email: {session?.user?.email || 'No email'}</div>
        <div>Role: {session?.user?.role || 'No role'}</div>
        <div>User ID: {session?.user?.id || 'No ID'}</div>
        <button
          onClick={() => alert(JSON.stringify(session, null, 2))}
          style={{
            backgroundColor: '#ffffff',
            color: '#ff0000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px',
            fontWeight: 'bold'
          }}
        >
          Show Full Session Data
        </button>
      </div>

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
                  alert(`
                    Menu clicked!
                    Session status: ${sessionStatus}
                    User email: ${session?.user?.email || 'No email'}
                    User role: ${session?.user?.role || 'No role'}
                    Is authorized: ${isAuthorized}
                  `);
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
                <span>{format(event.startDate, "PPP")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{format(event.startDate, "HH:mm")} - {format(endDate, "HH:mm")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
              {event.prize && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="line-clamp-1">{event.prize}</span>
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
                      {format(event.startDate, "PPP")}
                      <br />
                      {format(event.startDate, "HH:mm")} - {format(endDate, "HH:mm")}
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

                {event.prize && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Prize</p>
                      <p className="text-muted-foreground">{event.prize}</p>
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