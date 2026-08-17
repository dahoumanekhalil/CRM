import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  MessagesSquare,
  Pencil,
  Phone,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  XSquare,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { ActivityRow } from "@/lib/activity";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatStatus(s: string | undefined): string {
  const map: Record<string, string> = {
    NEW: "New",
    CONTACTED: "Contacted",
    INTERESTED: "Interested",
    FOLLOW_UP: "Follow-up",
    REGISTERED: "Registered",
    LOST: "Lost",
  };
  return s ? (map[s] ?? s) : "";
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d, yyyy");
}

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

type Meta = Record<string, unknown>;

function getIcon(type: string, meta: unknown) {
  const m = meta as Meta | null | undefined;

  switch (type) {
    case "lead.created":
    case "record.created":
      return Sparkles;
    case "lead.updated":
    case "record.updated":
      return Pencil;
    case "lead.status_changed":
    case "registration.status_changed":
    case "payment.status_changed":
      return RefreshCw;
    case "lead.owner_changed":
    case "lead.converted":
      return UserCheck;
    case "lead.next_action_set":
      return CalendarDays;
    case "lead.next_action_completed":
      return CheckCircle2;
    case "communication.logged": {
      const ct = m?.communicationType as string | undefined;
      if (ct === "CALL") return Phone;
      if (ct === "EMAIL") return Mail;
      if (ct === "SMS") return MessageSquare;
      if (ct === "WHATSAPP") return MessagesSquare;
      if (ct === "MEETING") return Users;
      if (ct === "NOTE") return FileText;
      return MessagesSquare;
    }
    case "task.created":
      return ClipboardList;
    case "task.completed":
      return CheckSquare;
    case "task.cancelled":
      return XSquare;
    case "registration.created":
      return ClipboardList;
    case "payment.created":
      return Wallet;
    default:
      return Pencil;
  }
}

function describeEvent(type: string, meta: unknown): string {
  const m = meta as Meta | null | undefined;

  switch (type) {
    case "lead.created":
      return "Lead captured";
    case "record.created":
      return "Record created";
    case "lead.updated":
    case "record.updated":
      return "Details updated";
    case "lead.status_changed": {
      const from = m?.from as string | undefined;
      const to = m?.to as string | undefined;
      if (from && to) {
        return `Status changed from ${formatStatus(from)} to ${formatStatus(to)}`;
      }
      return "Status changed";
    }
    case "lead.owner_changed":
      return "Owner changed";
    case "lead.converted":
      return "Converted to student";
    case "lead.next_action_set":
      return "Next action scheduled";
    case "lead.next_action_completed":
      return "Next action completed";
    case "communication.logged": {
      const ct = m?.communicationType as string | undefined;
      const dir = m?.direction as string | undefined;
      const typeLabel =
        ct === "CALL"
          ? "Call"
          : ct === "EMAIL"
            ? "Email"
            : ct === "SMS"
              ? "SMS"
              : ct === "WHATSAPP"
                ? "WhatsApp message"
                : ct === "MEETING"
                  ? "Meeting"
                  : ct === "NOTE"
                    ? "Note"
                    : "Message";
      const verb = dir === "INBOUND" ? "received" : "logged";
      if (ct === "NOTE") return "Note added";
      return `${typeLabel} ${verb}`;
    }
    case "task.created": {
      const title = m?.taskTitle as string | undefined;
      return title ? `Task created: "${title}"` : "Task created";
    }
    case "task.completed": {
      const title = m?.taskTitle as string | undefined;
      return title ? `Task completed: "${title}"` : "Task completed";
    }
    case "task.cancelled":
      return "Task cancelled";
    case "task.reopened":
      return "Task reopened";
    case "registration.created": {
      const course = m?.courseName as string | undefined;
      return course ? `Registered for ${course}` : "Registration created";
    }
    case "registration.status_changed": {
      const to = m?.to as string | undefined;
      return to ? `Registration ${to.toLowerCase()}` : "Registration updated";
    }
    case "payment.created":
      return "Payment recorded";
    case "payment.status_changed": {
      const to = m?.to as string | undefined;
      return to ? `Payment marked ${to.toLowerCase()}` : "Payment updated";
    }
    default:
      return type.split(".").join(" ");
  }
}

function getSnippet(type: string, meta: unknown): string | null {
  if (type !== "communication.logged") return null;
  const m = meta as Meta | null | undefined;
  if (!m) return null;
  const subject = m.subject as string | undefined;
  const snippet = m.snippet as string | undefined;
  return subject ? `Subject: ${subject}` : (snippet ?? null);
}

// ─── grouping ────────────────────────────────────────────────────────────────

type EventGroup = {
  key: string;
  label: string;
  events: ActivityRow[];
};

function groupByDay(events: ActivityRow[]): EventGroup[] {
  const groups: Map<string, EventGroup> = new Map();

  for (const event of events) {
    const k = dayKey(event.createdAt);
    if (!groups.has(k)) {
      groups.set(k, { key: k, label: dayLabel(event.createdAt), events: [] });
    }
    groups.get(k)!.events.push(event);
  }

  // Sort groups descending (most recent first), events within each group are
  // already in desc order from the query.
  return Array.from(groups.values()).sort((a, b) => (a.key > b.key ? -1 : 1));
}

// ─── component ───────────────────────────────────────────────────────────────

export function ActivityTimeline({ events }: { events: ActivityRow[] }) {
  if (events.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  const groups = groupByDay(events);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <ol className="relative space-y-4 border-s border-border/60 ps-6">
            {group.events.map((event) => {
              const Icon = getIcon(event.type, event.meta);
              const description = describeEvent(event.type, event.meta);
              const snippet = getSnippet(event.type, event.meta);
              const actor = event.user
                ? (event.user.name ?? event.user.email)
                : "System";
              const initial = actor.charAt(0).toUpperCase();

              return (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute -start-[27px] top-1 grid size-5 place-items-center rounded-full border border-border bg-background text-muted-foreground"
                  >
                    <Icon className="size-3" />
                  </span>
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                      title={actor}
                    >
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{description}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{actor}</span>
                        <span className="opacity-40">·</span>
                        <span title={format(event.createdAt, "PPpp")}>
                          {format(event.createdAt, "HH:mm")}
                        </span>
                      </div>
                      {snippet ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {snippet}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
