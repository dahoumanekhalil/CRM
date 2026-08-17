"use client";

import * as React from "react";
import type { Session } from "next-auth";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { CommandMenu } from "./command-menu";
import { QuickCreateMenu } from "./quick-create-menu";

export function AppShell({
  session,
  initialUnreadCount = 0,
  children,
}: {
  session: Session | null;
  initialUnreadCount?: number;
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);

  // Global `c` shortcut — opens quick-create when not typing in an input.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const target = e.target as Element | null;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isEditing) return;

      // Don't fire if either menu is already open.
      if (commandOpen || quickCreateOpen) return;

      e.preventDefault();
      setQuickCreateOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [commandOpen, quickCreateOpen]);

  return (
    <SidebarProvider>
      <AppSidebar session={session} onOpenCommand={() => setCommandOpen(true)} />
      <SidebarInset>
        <AppTopbar
          onOpenCommand={() => setCommandOpen(true)}
          onOpenQuickCreate={() => setQuickCreateOpen(true)}
          initialUnreadCount={initialUnreadCount}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        userRole={session?.user?.role}
      />
      <QuickCreateMenu
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        userRole={session?.user?.role}
      />
    </SidebarProvider>
  );
}
