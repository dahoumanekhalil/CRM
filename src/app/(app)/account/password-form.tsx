"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { changePassword, type ChangePasswordInput } from "./actions";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters").max(200),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await changePassword(values as ChangePasswordInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated");
      form.reset();
      setDone(true);
    });
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Password</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {hasPassword
            ? "Change your sign-in password. You'll use the new password on your next sign-in."
            : "Your account uses social sign-in and doesn't have a password."}
        </p>
      </div>

      {!hasPassword ? null : done ? (
        <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3">
          <p className="text-sm font-medium text-success">Password updated successfully.</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your new password is active.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-auto px-0 text-xs"
            onClick={() => setDone(false)}
          >
            Change again
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrent ? "text" : "password"}
                        autoComplete="current-password"
                        className="pe-9"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showCurrent ? "Hide" : "Show"}
                      >
                        {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNew ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        className="pe-9"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showNew ? "Hide" : "Show"}
                      >
                        {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={pending} size="sm">
                {pending && <Loader2 className="animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </Form>
      )}
    </section>
  );
}
