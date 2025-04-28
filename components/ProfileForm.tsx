"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/lib/actions";
import { UserWithExtras } from "@/lib/definitions";
import { UserSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import UserAvatar from "./UserAvatar";
import { Switch } from "./ui/switch";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, AtSign, Link as LinkIcon, MapPin, Calendar, Lock, Globe2, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import ProfilePictureOptionsModal from "./modals/ProfilePictureOptionsModal";
import { cn, containsUrl } from "@/lib/utils";
import { EmojiPicker } from "./EmojiPicker";
import VerifiedBadge from "./VerifiedBadge";
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
import { getSocket } from "@/lib/socket";

type ProfileFormErrors = {
  [K in keyof z.infer<typeof UserSchema>]?: string[];
} & {
  form?: string[];
};

function ProfileForm({ profile }: { profile: UserWithExtras }) {
  const router = useRouter();
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const socket = getSocket();
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("[ProfileForm] Socket connected");
      setIsSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log("[ProfileForm] Socket disconnected");
      setIsSocketConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    // Set initial connection state
    setIsSocketConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  const emitClearFollowRequests = useCallback(() => {
    if (!socket) return;

    const tryEmit = () => {
      if (socket.connected) {
        console.log("[ProfileForm] Socket is connected, emitting clearFollowRequests");
        socket.emit("clearFollowRequests", {
          userId: profile.id,
          action: "clear"
        });
        return true;
      }
      return false;
    };

    // Try to emit immediately if connected
    if (!tryEmit()) {
      console.log("[ProfileForm] Socket not connected, attempting reconnection");
      socket.connect();
      
      // Set up a retry mechanism
      let retryCount = 0;
      const maxRetries = 3;
      const retryInterval = setInterval(() => {
        retryCount++;
        if (tryEmit() || retryCount >= maxRetries) {
          clearInterval(retryInterval);
          if (retryCount >= maxRetries) {
            console.log("[ProfileForm] Failed to emit after max retries");
          }
        }
      }, 1000);

      // Also listen for connection to try emitting again
      const handleConnect = () => {
        console.log("[ProfileForm] Socket reconnected, attempting to emit");
        if (tryEmit()) {
          socket.off("connect", handleConnect);
        }
      };

      socket.on("connect", handleConnect);

      return () => {
        clearInterval(retryInterval);
        socket.off("connect", handleConnect);
      };
    }
  }, [socket, profile.id]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`/api/users/follow-requests/count`);
      const data = await response.json();
      if (response.ok) {
        setPendingRequestsCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching pending requests count:", error);
    }
  };

  useEffect(() => {
    // Fetch pending follow requests count when component mounts
    fetchPendingRequests();
  }, []); // Remove the profile.isPrivate dependency

  const form = useForm<z.infer<typeof UserSchema>>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      id: profile.id,
      image: profile.image || "",
      name: profile.name || "",
      bio: profile.bio || "",
      isPrivate: profile.isPrivate || false,
    },
  });

  const { isDirty, isSubmitting, isValid, errors } = form.formState;

  const handleProfilePhotoClick = () => {
    setIsOptionsModalOpen(true);
  };

  const handlePrivacyChange = async (checked: boolean) => {
    // If switching to public, check for pending requests first
    if (!checked) {
      await fetchPendingRequests(); // Fetch latest count
      if (pendingRequestsCount > 0) {
        setShowPrivacyWarning(true);
        return;
      }
    }
    
    // Always mark the form as dirty when toggling privacy
    form.setValue("isPrivate", checked, { shouldDirty: true, shouldValidate: true });
    form.setValue("id", profile.id, { shouldDirty: true });
    
    // Force form state update
    form.trigger("isPrivate");
  };

  const handlePrivacyWarningConfirm = async () => {
    form.setValue("isPrivate", false, { shouldDirty: true, shouldValidate: true });
    setShowPrivacyWarning(false);
    
    // Optimistically update UI immediately
    setPendingRequestsCount(0);
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('hideFollowRequests');
      window.dispatchEvent(event);
    }
    
    // Attempt to emit socket event
    emitClearFollowRequests();
  };

  const handleSubmit = async (values: z.infer<typeof UserSchema>) => {
    if (containsUrl(values.bio || "")) {
      toast.error("URLs are not allowed in bio");
      return;
    }

    const changedValues = {
      id: values.id,
      isPrivate: values.isPrivate, // Always include isPrivate in the update
      ...(form.formState.dirtyFields.name && { name: values.name }),
      ...(form.formState.dirtyFields.bio && { bio: values.bio }),
      ...(form.formState.dirtyFields.image && { image: values.image })
    };

    const result = await updateProfile(changedValues);
    if (result.message === "Profile updated successfully") {
      toast.success(result.message);
      
      if (profile.isPrivate && !values.isPrivate) {
        // Optimistically update UI
        setPendingRequestsCount(0);
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('hideFollowRequests');
          window.dispatchEvent(event);
        }
        
        // Emit socket event to notify about cleared follow requests
        emitClearFollowRequests();
        
        // Update the UI without a full page refresh
        router.refresh();
      } else {
        router.refresh();
      }
    } else {
      toast.error(result.message);
      if (result.errors) {
        const errors = result.errors as ProfileFormErrors;
        Object.entries(errors).forEach(([key, messages]) => {
          if (key === "form") {
            toast.error(messages[0]);
          } else {
            form.setError(key as keyof z.infer<typeof UserSchema>, {
              type: "manual",
              message: messages[0]
            });
          }
        });
      }
    }
  };

  return (
    <div className="bg-white dark:bg-black">
      <div className="flex flex-col">
        {/* Profile Header with Avatar */}
        <div className="bg-white dark:bg-black p-8 sm:p-10 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex flex-col items-center gap-7 max-w-3xl mx-auto">
            <div className="relative group">
              <div className="relative cursor-pointer" onClick={handleProfilePhotoClick}>
                <UserAvatar 
                  user={profile} 
                  className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white dark:border-black shadow-xl cursor-pointer transition-transform duration-300 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                  <span className="text-white text-sm font-medium">Change Photo</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {profile.username}
                </h3>
                {profile.verified && <VerifiedBadge size={20} />}
              </div>
              {profile.verified ? (
                <span className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified
                </span>
              ) : (
                <button
                  onClick={() => router.push("/dashboard/verify")}
                  className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Get Verified
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Picture Options Modal */}
        <ProfilePictureOptionsModal
          open={isOptionsModalOpen}
          onOpenChange={setIsOptionsModalOpen}
          hasStory={profile.hasActiveStory || false}
          userId={profile.id}
          isOwnProfile={true}
        />

        <AlertDialog open={showPrivacyWarning} onOpenChange={setShowPrivacyWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to Public Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                You have {pendingRequestsCount} pending follow {pendingRequestsCount === 1 ? 'request' : 'requests'}. 
                Switching to a public profile will delete all pending follow requests.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowPrivacyWarning(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePrivacyWarningConfirm}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Form Fields */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-6 sm:p-8"
          >
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Basic Info Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <UserAvatar user={profile} className="w-5 h-5" />
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Basic Information</h2>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 md:gap-8 items-start">
                        <div className="flex flex-col">
                          <FormLabel className="text-neutral-900 dark:text-white font-semibold mb-1">
                            Display Name
                          </FormLabel>
                          <FormDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
                            Your public display name
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder="Your display name"
                                {...field}
                                className="bg-white dark:bg-black border-2 border-neutral-200 dark:border-neutral-800 rounded-xl
                                focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 text-base h-11 pl-4 pr-10"
                              />
                            </FormControl>
                            {field.value && !errors.name && form.formState.dirtyFields.name && (
                              <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                            )}
                            {errors.name && (
                              <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <FormDescription className="text-neutral-500 dark:text-neutral-400 text-sm flex justify-between">
                            <span className="hidden sm:inline">Help people discover your account by using the name you're known by.</span>
                            <span className="text-neutral-400 sm:ml-1">
                              {field.value?.length || 0}/30
                            </span>
                          </FormDescription>
                          <FormMessage className="text-sm" />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Bio Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Bio & Description</h2>
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 md:gap-8 items-start">
                        <div className="flex flex-col">
                          <FormLabel className="text-neutral-900 dark:text-white font-semibold mb-1">
                            Bio
                          </FormLabel>
                          <FormDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
                            Tell your story
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          <div className="relative">
                            <FormControl>
                              <Textarea 
                                className="resize-none bg-white dark:bg-black border-2 border-neutral-200 dark:border-neutral-800 rounded-xl
                                focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[140px] text-base p-4 pr-12" 
                                placeholder="Write something about yourself..."
                                {...field} 
                              />
                            </FormControl>
                            <div className="absolute right-3 bottom-3">
                              <EmojiPicker
                                onChange={(emoji) => {
                                  field.onChange(field.value + emoji);
                                }}
                              />
                            </div>
                          </div>
                          <FormDescription className="text-neutral-500 dark:text-neutral-400 text-sm flex justify-between">
                            <span>Add a bio to tell more about yourself</span>
                            <span className="text-neutral-400 sm:ml-1">
                              {field.value?.length || 0}/150
                            </span>
                          </FormDescription>
                          <FormMessage className="text-sm" />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Privacy Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  {profile.isPrivate ? (
                    <Lock className="w-5 h-5 text-neutral-500" />
                  ) : (
                    <Globe2 className="w-5 h-5 text-neutral-500" />
                  )}
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Privacy Settings</h2>
                </div>

                <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 md:gap-8 items-start">
                        <div className="flex flex-col">
                          <FormLabel className="text-neutral-900 dark:text-white font-semibold mb-1">
                            Account Privacy
                          </FormLabel>
                          <FormDescription className="text-neutral-500 dark:text-neutral-400 text-sm">
                            Control your visibility
                          </FormDescription>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-neutral-900 dark:text-white">
                              Private Account
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {field.value
                                ? "Only approved followers can see your photos and videos"
                                : "Anyone can see your photos and videos"}
                            </div>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={handlePrivacyChange}
                            className="ml-4"
                          />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  type="submit"
                  disabled={!isDirty || isSubmitting || !isValid}
                  className={cn(
                    "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
                    "text-white px-8 py-2.5 rounded-xl font-medium shadow-sm",
                    "disabled:from-blue-500/50 disabled:to-blue-600/50 disabled:cursor-not-allowed",
                    "transition-all duration-300"
                  )}
                  onClick={() => {
                    console.log("[ProfileForm] Save button clicked with state:", {
                      isDirty,
                      isSubmitting,
                      isValid,
                      formState: form.formState,
                      dirtyFields: form.formState.dirtyFields
                    });
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default ProfileForm;
