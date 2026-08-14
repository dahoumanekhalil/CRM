"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updateProfile } from "./actions";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

type FormValues = z.infer<typeof schema>;

function initials(name: string, email: string) {
  const base = name || email || "?";
  return base
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [pending, startTransition] = React.useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateProfile(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile updated");
      form.reset(values);
    });
  });

  const currentName = form.watch("name");
  const isDirty = form.formState.isDirty;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Profile</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Your public name shown across the app.</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="size-14 rounded-xl">
          <AvatarFallback className="rounded-xl bg-primary/15 text-primary text-lg font-semibold">
            {initials(currentName, email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium truncate">{currentName || "—"}</p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input placeholder="Your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center gap-3">
            <FormItem className="flex-1">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input value={email} disabled readOnly className="bg-muted/50 text-muted-foreground cursor-default" />
              </FormControl>
            </FormItem>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !isDirty} size="sm">
              {pending && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
