"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  Loader2,
  Monitor,
  Redo2,
  Rocket,
  Settings,
  Smartphone,
  Tablet,
  Undo2,
  UndoDot,
} from "lucide-react";
import { BackArrow } from "@/components/primitives/nav-arrow";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Kbd } from "@/components/primitives/kbd";
import { cn } from "@/lib/utils";
import type { LandingBlock, Theme } from "@/lib/landing-blocks/types";

import { SettingsSheet } from "./settings-sheet";
import { setLandingPageStatus } from "../../actions";
import { EditorProvider, useEditor } from "./editor-store";
import { BlockLibrary } from "./block-library";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { SaveStatus } from "./save-status";
import { useAutosave } from "./use-autosave";
import { FormsProvider, type FormPickerItem } from "./forms-context";

type Device = "desktop" | "tablet" | "mobile";

type PageInfo = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  course: { id: string; name: string; slug: string } | null;
};

export function EditClient({
  page,
  blocks,
  theme,
  forms = [],
}: {
  page: PageInfo;
  blocks: LandingBlock[];
  theme: Theme;
  forms?: FormPickerItem[];
}) {
  return (
    <FormsProvider forms={forms}>
      <EditorProvider initialBlocks={blocks} initialTheme={theme}>
        <EditorLayout page={page} />
      </EditorProvider>
    </FormsProvider>
  );
}

function EditorLayout({ page }: { page: PageInfo }) {
  const router = useRouter();
  const [device, setDevice] = React.useState<Device>("desktop");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const {
    blocks,
    theme,
    isDirty,
    rev,
    markSaved,
    canUndo,
    canRedo,
    undo,
    redo,
    removeBlock,
    select,
    selectedId,
  } = useEditor();

  const { state: saveState, savedAt } = useAutosave({
    id: page.id,
    blocks,
    theme,
    isDirty,
    rev,
    onSaved: markSaved,
  });

  const isPublished = page.status === "PUBLISHED";

  // Global keyboard shortcuts — skip when the user is focused in an input,
  // textarea, or contenteditable so we don't steal normal text-editing keys.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (isEditing) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeBlock(selectedId);
        return;
      }
      if (e.key === "Escape" && selectedId) {
        e.preventDefault();
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeBlock, select, selectedId]);

  const togglePublish = () => {
    if (isDirty && !isPublished) {
      toast.info("Saving changes before publishing…");
    }
    startTransition(async () => {
      const res = await setLandingPageStatus(
        page.id,
        isPublished ? "DRAFT" : "PUBLISHED"
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isPublished ? "Page unpublished" : "Page published");
      router.refresh();
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Editor toolbar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-background/80 px-4 py-2.5 backdrop-blur-md">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/landing-pages">
            <BackArrow /> All pages
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{page.title}</span>
            <StatusBadge status={page.status} />
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {page.course ? (
              <>
                <Link
                  href={`/courses/${page.course.slug}`}
                  className="hover:underline"
                >
                  {page.course.name}
                </Link>
                <span className="mx-1.5 opacity-40">·</span>
              </>
            ) : null}
            /p/{page.slug}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="hidden items-center rounded-md border border-border/70 bg-muted/30 p-0.5 sm:flex">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (⌘Z)"
            className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
            className="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Redo2 className="size-4" />
          </button>
        </div>

        {/* Save status */}
        <SaveStatus state={saveState} savedAt={savedAt} isDirty={isDirty} />

        {/* Device switcher */}
        <div className="hidden items-center rounded-md border border-border/70 bg-muted/30 p-0.5 md:flex">
          <DeviceButton
            active={device === "desktop"}
            onClick={() => setDevice("desktop")}
            label="Desktop"
          >
            <Monitor className="size-4" />
          </DeviceButton>
          <DeviceButton
            active={device === "tablet"}
            onClick={() => setDevice("tablet")}
            label="Tablet"
          >
            <Tablet className="size-4" />
          </DeviceButton>
          <DeviceButton
            active={device === "mobile"}
            onClick={() => setDevice("mobile")}
            label="Mobile"
          >
            <Smartphone className="size-4" />
          </DeviceButton>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings /> Settings
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink /> View public
            </a>
          </Button>
          <Button size="sm" onClick={togglePublish} disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : isPublished ? (
              <UndoDot />
            ) : (
              <Rocket />
            )}
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Keyboard-shortcut hint strip */}
      <div className="hidden items-center justify-center gap-4 border-b border-border/60 bg-muted/20 py-1 text-[10px] text-muted-foreground sm:flex">
        <span className="inline-flex items-center gap-1">
          <Kbd>⌘Z</Kbd> undo
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>⌘⇧Z</Kbd> redo
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Del</Kbd> delete selected
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Esc</Kbd> deselect
        </span>
      </div>

      {/* Three-panel workspace */}
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[260px] shrink-0 md:block">
          <BlockLibrary />
        </div>
        <Canvas device={device} />
        <div className="hidden w-[320px] shrink-0 md:block">
          <Inspector />
        </div>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        page={page}
      />
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
