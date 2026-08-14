"use client";

import * as React from "react";
import { Mail, MessageSquare, Phone, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunicationSheet } from "@/components/shared/communication-sheet";
import type { CommunicationType } from "@/lib/schemas/communication";

const QUICK_ACTIONS: { type: CommunicationType; label: string; icon: typeof Phone }[] = [
  { type: "CALL", label: "Log call", icon: Phone },
  { type: "EMAIL", label: "Log email", icon: Mail },
  { type: "WHATSAPP", label: "Log WhatsApp", icon: MessageSquare },
  { type: "NOTE", label: "Add note", icon: StickyNote },
];

export function QuickActionsRow({ leadId }: { leadId: string }) {
  const [commOpen, setCommOpen] = React.useState(false);
  const [commType, setCommType] = React.useState<CommunicationType>("CALL");

  function open(type: CommunicationType) {
    setCommType(type);
    setCommOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => open(type)}
          >
            <Icon className="size-3.5" />
            {label}
          </Button>
        ))}
      </div>
      <CommunicationSheet
        open={commOpen}
        onOpenChange={setCommOpen}
        leadId={leadId}
        defaultType={commType}
      />
    </>
  );
}
