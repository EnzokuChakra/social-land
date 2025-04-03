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
import ProfileAvatar from "./ProfileAvatar";
import UserAvatar from "./UserAvatar";
import { Switch } from "./ui/switch";
import { useRouter } from "next/navigation";
import { CheckCircle, Info, Loader2, UserCheck, Lock, AlertCircle } from "lucide-react";
import { useEditProfileModal } from "@/hooks/use-edit-profile-modal";
import { useState } from "react";
import { useStoryModal } from "@/hooks/use-story-modal";
import ProfilePictureOptionsModal from "./modals/ProfilePictureOptionsModal";
import { cn } from "@/lib/utils";

type ProfileFormErrors = {
  [K in keyof z.infer<typeof UserSchema>]?: string[];
} & {
  form?: string[];
};

function ProfileForm({ profile }: { profile: UserWithExtras }) {
  const router = useRouter();
  const editProfileModal = useEditProfileModal();
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

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

  return (
    <div className="bg-white dark:bg-black rounded-xl overflow-hidden">
      <div className="flex flex-col">
        {/* Profile Header with Avatar */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-black dark:to-black p-4 sm:p-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="relative cursor-pointer" onClick={handleProfilePhotoClick}>
                <UserAvatar 
                  user={profile} 
                  className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white dark:border-black shadow-md cursor-pointer transition-transform group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {profile.username}
              </h3>
              <button
                onClick={handleProfilePhotoClick}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium cursor-pointer transition-colors"
              >
                Change profile photo
              </button>
              {profile.verified && (
                <div className="flex items-center gap-1 mt-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-black px-2 py-1 rounded-full text-xs border border-transparent dark:border-green-800">
                  <CheckCircle className="h-3 w-3" />
                  <span>Verified Account</span>
                </div>
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

        {/* Form Fields */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              // Only include fields that have been changed
              const changedValues = {
                id: values.id,
                ...(form.formState.dirtyFields.name && { name: values.name }),
                ...(form.formState.dirtyFields.bio && { bio: values.bio }),
                ...(form.formState.dirtyFields.isPrivate && { isPrivate: values.isPrivate }),
                ...(form.formState.dirtyFields.image && { image: values.image })
              };

              const result = await updateProfile(changedValues);
              if (result.message === "Profile updated successfully") {
                toast.success(result.message);
                router.refresh();
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
            })}
            className="p-4 sm:p-6 space-y-6"
          >
            <div className="space-y-6 max-w-2xl mx-auto">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
                      <div className="flex flex-col">
                        <FormLabel className="text-neutral-900 dark:text-white font-medium mb-1">
                          Name
                        </FormLabel>
                        <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                          Your full name
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder="Your name"
                              {...field}
                              className="bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-md 
                              focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 text-sm h-10 pl-3 pr-8"
                            />
                          </FormControl>
                          {field.value && !errors.name && form.formState.dirtyFields.name && (
                            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                          {errors.name && (
                            <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs flex justify-between">
                          <span className="hidden sm:inline">Help people discover your account by using the name you're known by.</span>
                          <span className="text-neutral-400 sm:ml-1">
                            {field.value?.length || 0}/30
                          </span>
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
                      <div className="flex flex-col">
                        <FormLabel className="text-neutral-900 dark:text-white font-medium mb-1">
                          Bio
                        </FormLabel>
                        <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                          Tell others about yourself
                        </FormDescription>
                      </div>
                      <div className="space-y-2">
                        <FormControl>
                          <Textarea 
                            className="resize-none bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-md 
                            focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[120px] text-sm" 
                            placeholder="Write a short bio..."
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs flex justify-between">
                          <span>Add a bio to tell more about yourself</span>
                          <span className="text-neutral-400 sm:ml-1">
                            {field.value?.length || 0}/150
                          </span>
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
                      <div className="flex flex-col">
                        <FormLabel className="text-neutral-900 dark:text-white font-medium mb-1">
                          Private Account
                        </FormLabel>
                        <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                          Control your account privacy
                        </FormDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {field.value ? "Private" : "Public"}
                        </span>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting || !isValid}
                className={cn(
                  "bg-blue-500 hover:bg-blue-600 text-white",
                  (!isDirty || !isValid) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default ProfileForm;
