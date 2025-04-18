"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RegisterSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";

export default function RegisterForm() {
  const [isPending, setIsPending] = useState(false);
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof RegisterSchema>) {
    setIsPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message);
        return;
      }

      // If registration was successful, sign in the user
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: true,
        callbackUrl: "/",
      });
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Mobile Number or Email"
                    {...field}
                    className="h-[38px] px-2 py-[9px] border border-[#262626] rounded-[3px] bg-[#121212] text-[#737373] text-xs placeholder:text-[#737373]"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    placeholder="Username"
                    {...field}
                    className="h-[38px] px-2 py-[9px] border border-[#262626] rounded-[3px] bg-[#121212] text-[#737373] text-xs placeholder:text-[#737373]"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Password"
                    {...field}
                    className="h-[38px] px-2 py-[9px] border border-[#262626] rounded-[3px] bg-[#121212] text-[#737373] text-xs placeholder:text-[#737373]"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    {...field}
                    className="h-[38px] px-2 py-[9px] border border-[#262626] rounded-[3px] bg-[#121212] text-[#737373] text-xs placeholder:text-[#737373]"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white h-[32px] mt-8 text-[14px] font-semibold rounded-lg border-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? "Signing up..." : "Sign up"}
          </Button>
        </form>
      </Form>

      <p className="text-xs text-center text-[#737373] mt-4 px-4 leading-4">
        By signing up, you agree to our{" "}
        <a href="#" className="text-[#737373]">Terms</a>, <a href="#" className="text-[#737373]">Privacy Policy</a> and{" "}
        <a href="#" className="text-[#737373]">Cookies Policy</a>.
      </p>
    </>
  );
} 