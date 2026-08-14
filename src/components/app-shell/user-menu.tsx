"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronsUpDown,
  KeyRound,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "./change-password-dialog";

function initials(name?: string | null, email?: string | null) {
  const base = name || email || "?";
  return base
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ session }: { session: Session | null }) {
  const { isMobile } = useSidebar();
  const user = session?.user;
  const [changePwOpen, setChangePwOpen] = React.useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-md">
                  <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
                  <AvatarFallback className="rounded-md bg-primary/15 text-primary text-xs font-semibold">
                    {initials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.name ?? "Signed in"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email ?? "—"}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4 opacity-60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={8}
              className="w-56"
            >
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="truncate font-medium">
                    {user?.name ?? "Signed in"}
                  </span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user?.email ?? "—"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <UserCircle /> Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChangePwOpen(true)}>
                <KeyRound /> Change password
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ChangePasswordDialog
        open={changePwOpen}
        onOpenChange={setChangePwOpen}
      />
    </>
  );
}
