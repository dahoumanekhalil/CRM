"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { inviteUser } from "./actions";
import { ALL_ROLES, type UserRole } from "@/lib/permissions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

// Role descriptions for the picker tooltip.
const ROLE_DESC: Record<UserRole, string> = {
  ADMIN: "Full access incl. user management",
  MANAGER: "All features except user management",
  SALES: "Leads, students, courses, sessions",
  MARKETING: "Campaigns, landing pages, leads",
  TRAINER: "Courses, sessions, attendance",
  FINANCE: "Payments, students, courses",
  EMPLOYEE: "Read-only access to most areas",
};

function generatePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

const schema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z.string().trim().email("Enter a valid email").min(1),
  role: z.enum(ALL_ROLES as unknown as [UserRole, ...UserRole[]]).default("EMPLOYEE"),
  password: z.string().min(8, "At least 8 characters").max(128),
});

type FormInput = z.infer<typeof schema>;

interface Credentials {
  name: string;
  email: string;
  password: string;
  role: string;
}

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [showPass, setShowPass] = React.useState(false);
  const [created, setCreated] = React.useState<Credentials | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "EMPLOYEE",
      password: generatePassword(),
    },
  });

  // Reset on close.
  React.useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setCreated(null);
    setShowPass(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      role: "EMPLOYEE",
      password: generatePassword(),
    });
  }, [open, form]);

  const onSubmit = form.handleSubmit((values: FormInput) => {
    startTransition(async () => {
      const res = await inviteUser(values as Required<FormInput>);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCreated({
        name: res.data.name ?? values.firstName,
        email: res.data.email,
        password: values.password,
        role: values.role,
      });
      router.refresh();
    });
  });

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" /> Invite team member
          </DialogTitle>
          <DialogDescription>
            Create an account for a new team member. Share the credentials with
            them so they can sign in.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          /* ── Success: show credentials to share ── */
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
              <p className="font-medium text-success">
                {created.name} has been added to the team as{" "}
                {humanize(created.role)}.
              </p>
              <p className="mt-1 text-success/80">
                Share the credentials below. They can change their password
                after signing in.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 font-mono text-sm">
              {[
                { label: "URL", value: `${typeof window !== "undefined" ? window.location.origin : ""}/sign-in` },
                { label: "Email", value: created.email },
                { label: "Password", value: created.password },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {row.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(row.value, row.label)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Copy ${row.label}`}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={() => {
                const text = `Sign-in URL: ${window.location.origin}/sign-in\nEmail: ${created.email}\nPassword: ${created.password}`;
                void navigator.clipboard.writeText(text);
                toast.success("All credentials copied");
              }}
            >
              <Copy /> Copy all credentials
            </Button>
          </div>
        ) : (
          /* ── Invite form ── */
          <Form {...form}>
            <form
              id="invite-form"
              onSubmit={onSubmit}
              className="space-y-4 py-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="colleague@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ALL_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            <div>
                              <div className="font-medium">
                                {humanize(role)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ROLE_DESC[role]}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary password</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPass ? "text" : "password"}
                            {...field}
                            className="pe-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass((v) => !v)}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPass ? "Hide password" : "Show password"}
                          >
                            {showPass ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            form.setValue("password", generatePassword())
                          }
                          title="Generate new password"
                        >
                          ↺
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Auto-generated. The user should change it after first
                      sign-in.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        <DialogFooter>
          {created ? (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="invite-form"
                disabled={pending}
              >
                {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Create account
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
