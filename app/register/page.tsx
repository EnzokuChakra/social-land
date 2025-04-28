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
import { RegisterSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { Icons } from "@/components/icons";

type RegisterInput = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      // First check if email already exists
      const emailCheck = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      }).then(r => r.json());

      if (emailCheck.exists) {
        toast.error("This email is already registered. Please try logging in instead.");
        return;
      }

      // Then check if username is taken
      const usernameCheck = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: data.username }),
      }).then(r => r.json());

      if (usernameCheck.exists) {
        toast.error("This username is already taken. Please choose another one.");
        return;
      }

      // If all checks pass, proceed with registration
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          confirm_password: data.confirm_password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        switch (responseData.code) {
          case "INVALID_USERNAME":
            toast.error("Username can only contain letters, numbers, and underscores");
            break;
          case "USERNAME_TOO_SHORT":
            toast.error("Username must be at least 3 characters long");
            break;
          case "USERNAME_TOO_LONG":
            toast.error("Username must be less than 30 characters");
            break;
          case "INVALID_EMAIL":
            toast.error("Please enter a valid email address");
            break;
          case "PASSWORD_TOO_SHORT":
            toast.error("Password must be at least 6 characters long");
            break;
          case "PASSWORDS_DO_NOT_MATCH":
            toast.error("Passwords do not match");
            break;
          case "EMAIL_EXISTS":
            toast.error("This email is already registered");
            break;
          case "USERNAME_EXISTS":
            toast.error("This username is already taken");
            break;
          default:
            if (responseData.error) {
              toast.error(responseData.error);
            } else {
              toast.error("Failed to create account. Please try again.");
            }
        }
        return;
      }

      // Show success message
      toast.success("Account created successfully! Please log in.", {
        duration: 5000,
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container relative h-screen flex flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to create your account
          </p>
        </div>

        <div className="p-6 border border-border rounded-lg shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
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
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="px-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
} 