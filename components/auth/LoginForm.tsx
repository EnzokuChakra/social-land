"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormItem, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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

      console.log('[LOGIN DEBUG] Starting login process', { 
        email: data.email, 
        callbackUrl,
        isIframe: window !== window.parent,
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled
      });

      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      console.log('[LOGIN DEBUG] Sign in response', { 
        success: !res?.error, 
        error: res?.error,
        url: res?.url
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      console.log('[LOGIN DEBUG] Login successful, redirecting to', callbackUrl);
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error('[LOGIN DEBUG] Login error:', error);
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
            className="w-full bg-blue-500 hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <div className="mt-6" suppressHydrationWarning>
          <div className="relative" suppressHydrationWarning>
            <div className="absolute inset-0 flex items-center" suppressHydrationWarning>
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase" suppressHydrationWarning>
              <span className="bg-black px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-4 text-center" suppressHydrationWarning>
            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => signIn("google", { callbackUrl })}
              disabled={loading}
            >
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 