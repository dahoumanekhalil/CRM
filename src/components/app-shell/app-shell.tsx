"use client";

import * as React from "react";
import type { Session } from "next-auth";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { CommandMenu } from "./command-menu";

export function AppShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const [commandOpen, setCommandOpen] = React.useState(false);

  return (
    <SidebarProvider>
      <AppSidebar session={session} onOpenCommand={() => setCommandOpen(true)} />
      <SidebarInset>
        <AppTopbar onOpenCommand={() => setCommandOpen(true)} />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        userRole={session?.user?.role}
      />
    </SidebarProvider>
  );
}
