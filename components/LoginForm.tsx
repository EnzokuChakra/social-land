"use client";

// import { calSans } from "@/app/fonts";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      setLoading(true);

      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      // Use router.push instead of window.location for smoother navigation
      router.push(callbackUrl);

    } catch (error) {
      console.error('Login error:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex-1 rounded-lg bg-black px-6 pb-4 pt-8 mt-8" suppressHydrationWarning>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2" suppressHydrationWarning>
                  <Input
                    {...field}
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    disabled={loading}
                    className="h-11 bg-[#121212] border-[#262626] text-white placeholder:text-neutral-500"
                  />
                  {errors.email?.message && (
                    <FormMessage>{errors.email.message}</FormMessage>
                  )}
                </div>
              </FormItem>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-2" suppressHydrationWarning>
                  <Input
                    {...field}
                    placeholder="Password"
                    type="password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-11 bg-[#121212] border-[#262626] text-white placeholder:text-neutral-500"
                  />
                  {errors.password?.message && (
                    <FormMessage>{errors.password.message}</FormMessage>
                  )}
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="mt-4 text-center" suppressHydrationWarning>
          <a href="#" className="text-xs text-[#0095F6] hover:text-white">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
