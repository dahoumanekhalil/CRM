"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Kbd } from "@/components/primitives/kbd";
import { navGroups, type NavItem } from "./nav-config";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { useDirection } from "@/lib/use-direction";
import type { Session } from "next-auth";

function isActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }
  return pathname === item.href;
}

function isVisible(item: NavItem, role: string | undefined): boolean {
  // Hide items pointing at routes that don't exist yet.
  if (item.built === false) return false;
  if (item.permission) return hasPermission(role, item.permission);
  return true;
}

export function AppSidebar({
  session,
  onOpenCommand,
}: {
  session: Session | null;
  onOpenCommand: () => void;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [dir] = useDirection();
  // In RTL the nav drawer lives on the right, matching Arabic convention.
  const sidebarSide = dir === "rtl" ? "right" : "left";

  return (
    <Sidebar collapsible="icon" side={sidebarSide}>
      <SidebarHeader className="border-b border-sidebar-border/70">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 py-1.5"
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">W</span>
          </div>
          <div
            className={cn(
              "min-w-0 transition-opacity",
              collapsed && "opacity-0"
            )}
          >
            <p className="truncate text-sm font-semibold leading-tight">
              Webscale
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              Training CRM
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Search — ⌘K"
                  onClick={onOpenCommand}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Command />
                  <span>Search</span>
                  <Kbd className="ms-auto">⌘K</Kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {navGroups.map((group, i) => {
          const visibleItems = group.items.filter((it) =>
            isVisible(it, session?.user?.role)
          );
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={i}>
              {group.label ? (
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const active = isActive(pathname, item);
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Link href={item.href}>
                            {Icon ? <Icon /> : null}
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu session={session} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
