"use client";

import * as React from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Kbd } from "@/components/primitives/kbd";
import { ThemeToggle } from "./theme-toggle";
import { DirectionToggle } from "./direction-toggle";
import { NotificationBell } from "./notification-bell";
import { useT } from "@/lib/i18n/use-t";

interface AppTopbarProps {
  onOpenCommand: () => void;
  onOpenQuickCreate?: () => void;
  initialUnreadCount?: number;
}

export function AppTopbar({
  onOpenCommand,
  onOpenQuickCreate,
  initialUnreadCount = 0,
}: AppTopbarProps) {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur-md md:px-4">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="mx-1 h-5" />

      <button
        type="button"
        onClick={onOpenCommand}
        className="group flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-background/60 px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground md:max-w-md"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-start">
          {t("Search or jump to…")}
        </span>
        <Kbd className="group-hover:border-border">⌘K</Kbd>
      </button>

      <div className="ms-auto flex items-center gap-1">
        <Button
          size="sm"
          className="hidden md:inline-flex"
          onClick={onOpenQuickCreate}
          title={t("Quick create (C)")}
        >
          <Plus /> {t("Create")}
          <Kbd className="ms-1 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground/80">
            C
          </Kbd>
        </Button>
        <NotificationBell initialUnreadCount={initialUnreadCount} />
        <DirectionToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
