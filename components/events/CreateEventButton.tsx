"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, ImageIcon, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, TIMEZONE, formatCurrency } from "@/lib/utils";
import { EventSchema } from "@/lib/schemas";
import { toast } from "sonner";
import Image from "next/image";
import { TimePicker } from "@/components/ui/time-picker";
import { formatInTimeZone } from "date-fns-tz";
import { useSession } from "next-auth/react";

type EventFormData = {
  name: string;
  type: string;
  description: string;
  rules?: string;
  prizes?: string[];
  location: string;
  startDate: Date;
  photoUrl: string;
};

interface CreateEventButtonProps {
  onEventCreate: (formData: FormData) => Promise<void>;
}

export default function CreateEventButton({ onEventCreate }: CreateEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState<string>();
  const [prizes, setPrizes] = useState<string[]>([""]);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const form = useForm<EventFormData>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      rules: "",
      prizes: [""],
      location: "",
      photoUrl: "",
    },
  });

  const { isSubmitting } = form.formState;

  const addPrize = () => {
    setPrizes([...prizes, ""]);
  };

  const removePrize = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  const updatePrize = (index: number, value: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Check if the value exceeds $50,000,000
    if (parseFloat(numericValue) > 50000000) {
      toast.error("Prize amount cannot exceed $50,000,000");
      return;
    }
    
    // Format the value with dollar sign and commas
    const formattedValue = formatCurrency(numericValue);
    
    const newPrizes = [...prizes];
    newPrizes[index] = formattedValue;
    setPrizes(newPrizes);
    form.setValue("prizes", newPrizes);
  };

  async function onSubmit(data: EventFormData) {
    try {
      console.log("[CREATE_EVENT] Starting event creation...");
      console.log("[CREATE_EVENT] Session state:", { 
        hasSession: !!session,
        userId: session?.user?.id,
        userRole: session?.user?.role 
      });
      
      // Validate photo before proceeding
      if (!photo) {
        toast.error("Please upload an event photo");
        return;
      }

      // Validate photo size (max 5MB)
      if (photo.size > 5 * 1024 * 1024) {
        toast.error("Photo size must be less than 5MB");
        return;
      }

      // Validate photo type
      if (!photo.type.startsWith('image/')) {
        toast.error("Please upload a valid image file");
        return;
      }
      
      setIsCreatingEvent(true);
      const formData = new FormData();
      
      // Add basic fields
      formData.append("name", data.name);
      formData.append("type", data.type);
      formData.append("description", data.description);
      formData.append("rules", data.rules || "");
      formData.append("location", data.location);
      formData.append("startDate", data.startDate.toISOString());
      
      // Handle prizes
      const validPrizes = prizes.filter(prize => prize.trim() !== "");
      formData.append("prizes", JSON.stringify(validPrizes));
      
      // Handle photo - ensure it's properly appended
      formData.append("photo", photo);

      console.log("[CREATE_EVENT] Form data prepared:", {
        name: data.name,
        type: data.type,
        hasPhoto: !!photo,
        photoSize: photo.size,
        photoType: photo.type,
        prizeCount: validPrizes.length
      });

      await onEventCreate(formData);
      console.log("[CREATE_EVENT] Event created successfully");
      
      setOpen(false);
      form.reset();
      setPhoto(undefined);
      setPhotoPreview(undefined);
      setPrizes([""]);
      toast.success("Event created successfully!");
    } catch (error) {
      console.error("[CREATE_EVENT] Error creating event:", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("Failed to create event. Please try again.");
    } finally {
      setIsCreatingEvent(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        // Set a temporary URL for form validation
        form.setValue("photoUrl", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[95%] max-h-[90vh] overflow-y-auto p-0 gap-0 dark:bg-[#000000] bg-white dark:border-neutral-800 border-neutral-200">
        <DialogHeader className="sticky top-0 z-10 dark:bg-black/80 bg-white/80 /*backdrop-blur-sm*/ px-6 py-4 dark:border-neutral-800 border-neutral-200 border-b">
          <DialogTitle className="text-xl font-semibold dark:text-white text-neutral-900">Create Event</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6 dark:bg-black bg-white">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-8">
                <div className="col-span-full">
                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={() => (
                      <FormItem className="text-center">
                        <div className="space-y-4">
                          {photoPreview ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border dark:border-neutral-800 border-neutral-200">
                              <Image
                                src={photoPreview}
                                alt="Event photo preview"
                                fill
                                className="object-cover"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                                onClick={() => {
                                  setPhoto(undefined);
                                  setPhotoPreview(undefined);
                                  form.setValue("photoUrl", "");
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <label
                              htmlFor="photo"
                              className="relative block w-full aspect-video rounded-lg dark:border-neutral-800 border-neutral-200 dark:hover:border-neutral-700 hover:border-neutral-300 border-2 border-dashed dark:bg-neutral-900/50 bg-neutral-100/50 hover:cursor-pointer transition-colors"
                            >
                              <div className="flex flex-col items-center justify-center h-full gap-2">
                                <ImageIcon className="w-8 h-8 dark:text-neutral-400 text-neutral-600" />
                                <span className="text-sm dark:text-neutral-400 text-neutral-600">Click to upload event photo</span>
                              </div>
                            </label>
                          )}
                        </div>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            id="photo"
                            className="hidden"
                            onChange={handlePhotoChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-neutral-400 text-neutral-600">Event Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter event name" 
                            className="dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900 dark:placeholder:text-neutral-500 placeholder:text-neutral-400" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-neutral-400 text-neutral-600">Event Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Social, Sports, Education" 
                            className="dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900 dark:placeholder:text-neutral-500 placeholder:text-neutral-400" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-neutral-400 text-neutral-600">Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Event location" 
                            className="dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900 dark:placeholder:text-neutral-500 placeholder:text-neutral-400" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-neutral-400 text-neutral-600">Date & Time</FormLabel>
                        <div className="space-y-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full h-10 px-3 py-2 text-left font-normal",
                                    "dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900",
                                    !field.value && "dark:text-neutral-500 text-neutral-400"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Select event date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <DatePicker
                                selected={field.value}
                                onSelect={field.onChange}
                                className="w-full"
                              />
                            </PopoverContent>
                          </Popover>
                          <TimePicker
                            date={field.value}
                            setDate={field.onChange}
                            className="dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-neutral-400 text-neutral-600">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your event..."
                            className="min-h-[100px] dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900 dark:placeholder:text-neutral-500 placeholder:text-neutral-400 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="rules"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-neutral-400 text-neutral-600">Rules (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Event rules and guidelines..."
                              className="min-h-[80px] dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900 dark:placeholder:text-neutral-500 placeholder:text-neutral-400 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormLabel className="dark:text-neutral-400 text-neutral-600">Prizes (Optional)</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addPrize}
                          className="text-primary hover:text-primary/80"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Prize
                        </Button>
                      </div>
                      {prizes.map((prize, index) => (
                        <div key={index} className="flex gap-2">
                          <FormControl>
                            <Input 
                              placeholder={`Prize ${index + 1} (e.g., $500,000)`}
                              className="dark:bg-neutral-900/50 bg-neutral-100/50 dark:border-neutral-800 border-neutral-200 dark:text-white text-neutral-900 dark:placeholder:text-neutral-500 placeholder:text-neutral-400"
                              value={prize}
                              onChange={(e) => updatePrize(index, e.target.value)}
                            />
                          </FormControl>
                          {prizes.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePrize(index)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 dark:bg-black/80 bg-white/80 /*backdrop-blur-sm*/ pt-4 pb-4 -mx-6 px-6 dark:border-neutral-800 border-neutral-200 border-t">
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || isCreatingEvent}>
                  {(isSubmitting || isCreatingEvent) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 