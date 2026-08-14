"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Contact,
  CornerDownLeft,
  Globe,
  BookOpen,
  GraduationCap,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/primitives/kbd";
import { cn } from "@/lib/utils";

import {
  filterCommands,
  findCommandById,
  type StaticCommand,
  type UserRole,
} from "./command-menu-registry";
import { searchCommandMenu, type CommandSearchResults } from "./command-menu-search";
import { useRecentCommands } from "./use-recent-commands";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function CommandMenu({ open, onOpenChange, userRole }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CommandSearchResults | null>(null);
  const [searching, setSearching] = React.useState(false);
  const { recents, push, clear } = useRecentCommands();

  const availableCommands = React.useMemo(
    () => filterCommands(userRole as UserRole | undefined),
    [userRole]
  );

  const creates = availableCommands.filter((c) => c.group === "create");
  const gotos = availableCommands.filter((c) => c.group === "goto");

  const recentCommands = React.useMemo(() => {
    return recents
      .map((id) => findCommandById(id))
      .filter((c): c is StaticCommand => Boolean(c && c.available));
  }, [recents]);

  // Global ⌘K / Ctrl+K toggle
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Reset transient state whenever the palette closes. `open` is an external
  // control prop — this effect syncs local search state back to its initial
  // shape on close. The rule flags all setState in effect bodies, but here
  // the reset IS the intended sync.
  React.useEffect(() => {
    if (open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuery("");
    setResults(null);
    setSearching(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  // Debounced entity search — fires at 2+ chars. Any setState happens inside
  // callbacks (timeout / abort branch), never synchronously in the effect body
  // — required by React 19's `set-state-in-effect` rule.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchCommandMenu(q);
        if (!controller.signal.aborted) setResults(data);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  const runStatic = (cmd: StaticCommand) => {
    push(cmd.id);
    onOpenChange(false);
    router.push(cmd.href);
  };

  const runNav = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  // Only surface search results once the query is long enough. If the user
  // types fast and then deletes chars, `results` state may still hold data
  // from a stale query — this guard hides them.
  const queryReady = query.trim().length >= 2;
  const hasResults =
    queryReady &&
    !!results &&
    results.leads.length +
      results.courses.length +
      results.pages.length +
      results.students.length >
      0;

  const showRecents = !query.trim() && recentCommands.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Search or jump to anywhere in Webscale."
    >
      <CommandInput
        placeholder="Type a command or search…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching…" : "No results found."}
        </CommandEmpty>

        {showRecents && (
          <>
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3" /> Recent
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clear();
                    }}
                    className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
              }
            >
              {recentCommands.map((cmd) => (
                <StaticCommandItem
                  key={cmd.id}
                  command={cmd}
                  onSelect={() => runStatic(cmd)}
                />
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {hasResults && (
          <>
            {results!.leads.length > 0 && (
              <CommandGroup heading="Leads">
                {results!.leads.map((lead) => (
                  <ResultItem
                    key={`lead-${lead.id}`}
                    icon={Contact}
                    label={lead.name}
                    subline={lead.subline}
                    onSelect={() => runNav("/leads")}
                    // cmdk fuzzy-matches on value/keywords, so include name+subline.
                    value={`lead ${lead.name} ${lead.subline ?? ""}`}
                  />
                ))}
              </CommandGroup>
            )}
            {results!.courses.length > 0 && (
              <CommandGroup heading="Courses">
                {results!.courses.map((course) => (
                  <ResultItem
                    key={`course-${course.id}`}
                    icon={BookOpen}
                    label={course.name}
                    subline={course.subline}
                    onSelect={() => runNav(`/courses/${course.slug}`)}
                    value={`course ${course.name} ${course.subline ?? ""}`}
                  />
                ))}
              </CommandGroup>
            )}
            {results!.pages.length > 0 && (
              <CommandGroup heading="Landing pages">
                {results!.pages.map((page) => (
                  <ResultItem
                    key={`page-${page.id}`}
                    icon={Globe}
                    label={page.title}
                    subline={page.subline}
                    onSelect={() =>
                      runNav(`/landing-pages/${page.id}/edit`)
                    }
                    value={`page ${page.title} ${page.subline ?? ""}`}
                  />
                ))}
              </CommandGroup>
            )}
            {results!.students.length > 0 && (
              <CommandGroup heading="Students">
                {results!.students.map((student) => (
                  <ResultItem
                    key={`student-${student.id}`}
                    icon={GraduationCap}
                    label={student.name}
                    subline={student.subline}
                    onSelect={() => runNav(`/students/${student.id}`)}
                    value={`student ${student.name} ${student.subline ?? ""}`}
                  />
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        {creates.length > 0 && (
          <CommandGroup heading="Create">
            {creates.map((cmd) => (
              <StaticCommandItem
                key={cmd.id}
                command={cmd}
                onSelect={() => runStatic(cmd)}
              />
            ))}
          </CommandGroup>
        )}

        {gotos.length > 0 && (
          <>
            {creates.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Go to">
              {gotos.map((cmd) => (
                <StaticCommandItem
                  key={cmd.id}
                  command={cmd}
                  onSelect={() => runStatic(cmd)}
                />
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <CommandFooter />
    </CommandDialog>
  );
}

function StaticCommandItem({
  command,
  onSelect,
}: {
  command: StaticCommand;
  onSelect: () => void;
}) {
  const Icon = command.icon;
  const keywords = [
    command.label.toLowerCase(),
    command.group,
    ...(command.keywords ?? []),
  ];
  return (
    <CommandItem
      value={`${command.id} ${keywords.join(" ")}`}
      onSelect={onSelect}
    >
      <Icon />
      <span>{command.label}</span>
    </CommandItem>
  );
}

function ResultItem({
  icon: Icon,
  label,
  subline,
  value,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subline?: string;
  value: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <Icon className={cn("size-4")} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {subline ? (
          <span className="truncate text-xs text-muted-foreground">
            {subline}
          </span>
        ) : null}
      </div>
    </CommandItem>
  );
}

function CommandFooter() {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navigate
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>
            <CornerDownLeft className="size-2.5" />
          </Kbd>
          select
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>esc</Kbd>
          close
        </span>
      </div>
      <span className="inline-flex items-center gap-1">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
        toggle
      </span>
    </div>
  );
}
