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

function ProfileForm({ profile }: { profile: UserWithExtras }) {
  const router = useRouter();
  const editProfileModal = useEditProfileModal();
  const form = useForm<z.infer<typeof UserSchema>>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      id: profile.id,
      image: profile.image || "",
      name: profile.name || "",
      username: profile.username || "",
      bio: profile.bio || "",
      isPrivate: profile.isPrivate || false,
    },
  });

  const { isDirty, isSubmitting, isValid, errors } = form.formState;

  const handleProfilePhotoClick = () => {
    editProfileModal.onOpen();
  };

  return (
    <div className="bg-white dark:bg-black">
      {/* Profile Header with Avatar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-black dark:to-black p-2 md:p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col items-center gap-2 md:gap-4">
          <div className="relative group">
            <div className="relative cursor-pointer" onClick={handleProfilePhotoClick}>
              <UserAvatar 
                user={profile} 
                className="w-16 h-16 md:w-24 md:h-24 border-4 border-white dark:border-black shadow-md cursor-pointer transition-transform group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-0.5 md:gap-1">
            <h3 className="text-base md:text-lg font-semibold text-neutral-900 dark:text-white">
              {profile.username}
            </h3>
            <button
              onClick={handleProfilePhotoClick}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium cursor-pointer transition-colors"
            >
              Change profile photo
            </button>
            {profile.verified && (
              <div className="flex items-center gap-1 mt-0.5 md:mt-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-black px-2 py-0.5 md:py-1 rounded-full text-xs border border-transparent dark:border-green-800">
                <CheckCircle className="h-3 w-3" />
                <span>Verified Account</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await updateProfile(values);
            if (result.message === "Updated Profile.") {
              toast.success(result.message);
              router.refresh();
            } else if (result.message === "Username already exists") {
              toast.error(result.message);
              form.setError("username", {
                type: "manual",
                message: "This username is already taken"
              });
            } else {
              toast.error(result.message);
              if (result.errors?.form) {
                form.setError("form", {
                  type: "manual",
                  message: result.errors.form[0]
                });
              }
            }
          })}
          className="p-2 md:p-6 space-y-4 md:space-y-6"
        >
          <div className="space-y-4 md:space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-2 items-start">
                    <div className="flex flex-col">
                      <FormLabel className="text-neutral-900 dark:text-white font-medium mb-0.5 md:mb-1">
                        Name
                      </FormLabel>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                        Your full name
                      </FormDescription>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="Your name"
                            {...field}
                            className="bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-md 
                            focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 text-sm h-9 md:h-10 pl-3 pr-8"
                          />
                        </FormControl>
                        {field.value && !errors.name && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {errors.name && (
                          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                        Help people discover your account by using the name you're known by.
                        <span className="text-neutral-400 ml-1">
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
              name="username"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-2 items-start">
                    <div className="flex flex-col">
                      <FormLabel className="text-neutral-900 dark:text-white font-medium mb-0.5 md:mb-1">
                        Username
                      </FormLabel>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                        Your unique identifier
                      </FormDescription>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="relative">
                        <FormControl>
                          <Input 
                            placeholder="username" 
                            {...field} 
                            className="bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-md
                            focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 text-sm h-9 md:h-10 pl-3 pr-8" 
                          />
                        </FormControl>
                        {field.value && !errors.username && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {errors.username && (
                          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs flex justify-between">
                        <span>You can change your username back within 14 days.</span>
                        <span className="text-neutral-400">
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
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-2 items-start">
                    <div className="flex flex-col">
                      <FormLabel className="text-neutral-900 dark:text-white font-medium mb-0.5 md:mb-1">
                        Bio
                      </FormLabel>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                        Tell others about yourself
                      </FormDescription>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <FormControl>
                        <Textarea 
                          className="resize-none bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-md 
                          focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 min-h-[100px] md:min-h-[120px] text-sm" 
                          placeholder="Write a short bio..."
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs flex justify-end">
                        {field.value?.length || 0} / 150
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
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-2 items-start">
                    <div className="flex flex-col">
                      <FormLabel className="text-neutral-900 dark:text-white font-medium mb-0.5 md:mb-1">
                        Privacy
                      </FormLabel>
                      <FormDescription className="text-neutral-500 dark:text-neutral-400 text-xs">
                        Control who sees your content
                      </FormDescription>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">Private account</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            Only approved followers can see your content
                          </span>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2 md:pt-4">
              <Button
                type="submit"
                disabled={!isDirty || !isValid || isSubmitting}
                className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-500 dark:hover:bg-blue-600 
                rounded-lg px-4 py-2 text-sm font-medium h-9 md:h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default ProfileForm;
