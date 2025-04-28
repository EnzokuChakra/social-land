"use client";

import Error from "@/components/Error";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useMount from "@/hooks/useMount";
import { updatePost } from "@/lib/actions";
import { UpdatePost } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PostWithExtras } from "@/lib/definitions";

function EditPost({ 
  id, 
  post,
  onClose
}: { 
  id: string; 
  post: PostWithExtras;
  onClose: () => void;
}) {
  const mount = useMount();
  const router = useRouter();
  const form = useForm<z.infer<typeof UpdatePost>>({
    resolver: zodResolver(UpdatePost),
    defaultValues: {
      id: post.id,
      caption: post.caption || "",
      fileUrl: post.fileUrl,
    },
  });
  const fileUrl = form.watch("fileUrl");

  if (!mount) return null;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Edit Post</h2>
        <p className="text-sm text-neutral-500">Edit your post caption</p>
      </div>

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const res = await updatePost(values);

              if (res?.errors || res?.message) {
                toast.error(res.message || "Failed to update post");
                return;
              }

              toast.success("Post edited successfully");
              onClose();
              router.refresh();
            } catch (error) {
              console.error("Error updating post:", error);
              toast.error("Failed to update post");
            }
          })}
        >
          <FormField
            control={form.control}
            name="caption"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="caption">Caption</FormLabel>
                <FormControl>
                  <Input
                    type="caption"
                    id="caption"
                    placeholder="Write a caption..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full bg-neutral-900 text-white hover:bg-neutral-800">
            Done
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default EditPost;
