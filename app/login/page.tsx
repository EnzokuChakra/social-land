"use client";

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
import { LoginSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { Icons } from "@/components/icons";

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();

  // Clean up the callback URL
  const cleanCallbackUrl = useMemo(() => {
    if (!callbackUrl) return '/dashboard';
    try {
      // If it's a full URL, extract the pathname
      const url = new URL(callbackUrl);
      return url.pathname;
    } catch {
      // If it's not a valid URL, return the original value
      return callbackUrl;
    }
  }, [callbackUrl]);

  console.log('[Login] Initial render - Session status:', status);
  console.log('[Login] Session data:', session);
  console.log('[Login] Original callback URL:', callbackUrl);
  console.log('[Login] Clean callback URL:', cleanCallbackUrl);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    console.log('[Login] useEffect - Session status:', status);
    console.log('[Login] useEffect - Session data:', session);
    
    if (status === "authenticated" && session?.user) {
      console.log('[Login] Redirecting authenticated user to:', cleanCallbackUrl);
      // Force a hard refresh to ensure session is established
      window.location.href = cleanCallbackUrl;
    }
  }, [session, status, cleanCallbackUrl]);

  // If still loading session, show loading state
  if (status === "loading") {
    console.log('[Login] Showing loading state');
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const onSubmit = async (data: LoginInput) => {
    console.log('[Login] Submit attempt with email:', data.email);
    setLoading(true);
    
    try {
      console.log('[Login] Calling signIn...');
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: cleanCallbackUrl,
      });

      console.log('[Login] SignIn response:', res);

      if (res?.error) {
        console.log('[Login] SignIn error:', res.error);
        // Handle different error cases
        switch (res.error) {
          case "CredentialsSignin":
            try {
              // Check if email exists first
              const emailExists = await fetch("/api/auth/check-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: data.email }),
              }).then(r => r.json());

              console.log('[Login] Email exists check:', emailExists);

              if (!emailExists.exists) {
                toast.error("No account found with this email address");
              } else {
                // Check if user is banned
                const userStatus = await fetch("/api/auth/check-status", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email: data.email }),
                }).then(r => r.json());

                if (userStatus.status === "BANNED") {
                  toast.error("Your account is banned!");
                  setLoading(false);
                  return;
                }

                toast.error("Incorrect password");
              }
            } catch (error) {
              console.error('[Login] Error checking email:', error);
              toast.error("Invalid email or password");
            }
            break;
          case "AccessDenied":
            toast.error("Your account has been suspended");
            break;
          case "EmailNotVerified":
            toast.error("Please verify your email address first");
            break;
          default:
            toast.error("Invalid email or password");
        }
        setLoading(false);
        return;
      }

      // Show success message
      console.log('[Login] Login successful, waiting for session...');
      toast.success("Logged in successfully!");
      
      // If we have a URL in the response, use it
      if (res?.url) {
        console.log('[Login] Redirecting to:', res.url);
        window.location.href = res.url;
        return;
      }
      
      // Wait for session establishment with retries
      let sessionData = null;
      let retries = 3;
      while (retries > 0 && !sessionData?.user) {
        try {
          console.log(`[Login] Attempting to get session (${retries} retries left)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try both session endpoints
          const [sessionResponse, csrfResponse] = await Promise.all([
            fetch('/api/auth/session', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache',
              },
            }),
            fetch('/api/auth/csrf', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache',
              },
            })
          ]);
          
          const [sessionJson, csrfJson] = await Promise.all([
            sessionResponse.json(),
            csrfResponse.json()
          ]);
          
          console.log('[Login] Session check response:', sessionJson);
          console.log('[Login] CSRF check response:', csrfJson);
          
          if (sessionJson?.user) {
            sessionData = sessionJson;
            break;
          }
          
          retries--;
          if (retries === 0) {
            throw new Error('No session data found after retries');
          }
        } catch (error) {
          console.error('[Login] Error checking session:', error);
          retries--;
          if (retries === 0) {
            throw error;
          }
        }
      }
      
      // Force a hard refresh to ensure session is established
      console.log('[Login] Forcing page refresh to establish session...');
      window.location.href = cleanCallbackUrl;
    } catch (error) {
      console.error('[Login] Error during login:', error);
      toast.error("Session establishment failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="container relative h-screen flex flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to sign in to your account
          </p>
        </div>

        <div className="p-6 border border-border rounded-lg shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="px-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="underline underline-offset-4 hover:text-primary"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
} 