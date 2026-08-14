"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Crown, Loader2, Shield, Trash2, UserPlus, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { removeUser, updateUserRole } from "./actions";
import type { UserRow } from "./actions";
import { ALL_ROLES, type UserRole } from "@/lib/permissions";
import { InviteDialog } from "./invite-dialog";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

// Role descriptions shown in the role picker to help admins choose.
const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: "Full access — manage users, roles and all settings",
  MANAGER: "Most access except user management",
  SALES: "Leads, students, courses, sessions",
  MARKETING: "Campaigns, landing pages, leads",
  TRAINER: "Courses, sessions, attendance",
  FINANCE: "Payments, students, courses",
  EMPLOYEE: "Read access to leads, students, courses",
};

// Visual badge colour per role.
const ROLE_TONE: Record<UserRole, string> = {
  ADMIN:
    "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  MANAGER:
    "bg-info/10 text-info ring-1 ring-inset ring-info/20",
  SALES:
    "bg-success/10 text-success ring-1 ring-inset ring-success/20",
  MARKETING:
    "bg-chart-5/10 text-chart-5 ring-1 ring-inset ring-chart-5/20",
  TRAINER:
    "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
  FINANCE:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  EMPLOYEE:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (parts[0]?.[0] ?? "?").toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function TeamTab({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [inviteOpen, setInviteOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Team ({users.length} {users.length === 1 ? "member" : "members"})
            </h2>
            <p className="text-xs text-muted-foreground">
              Changes take effect on next sign-in.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus /> Invite member
        </Button>
      </div>

      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            isSelf={user.id === currentUserId}
          />
        ))}
      </ul>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="size-3.5" /> Role reference
        </div>
        <dl className="space-y-1">
          {ALL_ROLES.map((role) => (
            <div key={role} className="flex items-start gap-3 text-xs">
              <dt>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    ROLE_TONE[role]
                  )}
                >
                  {role === "ADMIN" ? (
                    <Crown className="size-2.5" />
                  ) : null}
                  {humanize(role)}
                </span>
              </dt>
              <dd className="text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function UserRow({
  user,
  isSelf,
}: {
  user: UserRow;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [optimisticRole, setOptimisticRole] = React.useState<string>(user.role);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const onRoleChange = (newRole: string) => {
    setOptimisticRole(newRole);
    startTransition(async () => {
      const res = await updateUserRole({ userId: user.id, role: newRole });
      if (!res.ok) {
        setOptimisticRole(user.role);
        toast.error(res.error);
        return;
      }
      toast.success(
        `${user.name ?? user.email ?? "User"} is now ${humanize(newRole)}`
      );
      router.refresh();
    });
  };

  const onRemove = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      // Auto-cancel after 3s if not clicked again.
      setTimeout(() => setConfirmRemove(false), 3000);
      return;
    }
    startTransition(async () => {
      const res = await removeUser(user.id);
      if (!res.ok) {
        toast.error(res.error);
        setConfirmRemove(false);
        return;
      }
      toast.success(`${user.name ?? user.email ?? "User"} removed`);
      router.refresh();
    });
  };

  const displayName = user.name ?? user.email ?? "Unknown";

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar className="size-9 shrink-0">
        <AvatarImage src={user.image ?? undefined} />
        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
          {initials(user.name, user.email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{displayName}</span>
          {isSelf ? (
            <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground">
              you
            </span>
          ) : null}
        </div>
        {user.email && user.name ? (
          <div className="truncate text-xs text-muted-foreground">
            {user.email}
          </div>
        ) : null}
        <div className="text-[11px] text-muted-foreground/70">
          Joined {formatDistanceToNow(user.createdAt, { addSuffix: true })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
        <Select
          value={optimisticRole}
          onValueChange={onRoleChange}
          disabled={pending}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {ALL_ROLES.map((role) => (
              <SelectItem key={role} value={role} className="text-xs">
                <span className="inline-flex items-center gap-1.5">
                  {role === "ADMIN" ? (
                    <Crown className="size-3 text-primary" />
                  ) : null}
                  {humanize(role)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isSelf ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            title={
              confirmRemove ? "Click again to confirm removal" : "Remove user"
            }
            className={cn(
              "grid size-8 place-items-center rounded transition-colors",
              confirmRemove
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-destructive"
            )}
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}
