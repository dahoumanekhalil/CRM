"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Code,
  Minus,
  Undo2,
  Redo2,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichNotesEditorProps {
  initialContent: string | null | undefined;
  onSave: (html: string) => Promise<void>;
  placeholder?: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

export function RichNotesEditor({
  initialContent,
  onSave,
  placeholder = "Write notes here…",
}: RichNotesEditorProps) {
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = React.useRef<string>(initialContent ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Keep history (undo/redo) from StarterKit
      }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[160px] px-5 py-4 text-sm leading-relaxed",
        "data-placeholder": placeholder,
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Skip if content hasn't actually changed (e.g. focus/blur events)
      if (html === lastSaved.current) return;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("idle");

      saveTimer.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          await onSave(html);
          lastSaved.current = html;
          setSaveState("saved");
          // Reset to idle after 2 s so the indicator doesn't stay forever
          setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
        } catch {
          setSaveState("error");
        }
      }, AUTOSAVE_DELAY_MS);
    },
  });

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="size-3.5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (⌘B)"
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic (⌘I)"
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Inline code"
          >
            <Code className="size-3.5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet list"
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered list"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote className="size-3.5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            title="Horizontal divider"
          >
            <Minus className="size-3.5" />
          </ToolbarButton>
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            disabled={!editor.can().undo()}
            title="Undo (⌘Z)"
          >
            <Undo2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            disabled={!editor.can().redo()}
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="size-3.5" />
          </ToolbarButton>
        </ToolbarGroup>

        {/* Save status — pushed to the end */}
        <div className="ms-auto flex items-center gap-1.5 pe-1 text-xs text-muted-foreground">
          <SaveIndicator state={saveState} />
        </div>
      </div>

      {/* Editor content area */}
      <EditorContent
        editor={editor}
        className="[&_.tiptap]:outline-none [&_.tiptap]:min-h-[160px] [&_.tiptap]:px-5 [&_.tiptap]:py-4 [&_.tiptap]:text-sm [&_.tiptap]:leading-relaxed
          [&_.tiptap_p]:mb-3 [&_.tiptap_p:last-child]:mb-0
          [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:mt-4 [&_.tiptap_h2]:text-base [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:first:mt-0
          [&_.tiptap_h3]:mb-1.5 [&_.tiptap_h3]:mt-3 [&_.tiptap_h3]:text-sm [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:first:mt-0
          [&_.tiptap_ul]:mb-3 [&_.tiptap_ul]:ms-4 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:space-y-1
          [&_.tiptap_ol]:mb-3 [&_.tiptap_ol]:ms-4 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:space-y-1
          [&_.tiptap_li_p]:mb-0
          [&_.tiptap_blockquote]:border-s-2 [&_.tiptap_blockquote]:border-border [&_.tiptap_blockquote]:ps-3 [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:mb-3
          [&_.tiptap_code]:rounded [&_.tiptap_code]:bg-muted [&_.tiptap_code]:px-1 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-xs
          [&_.tiptap_pre]:rounded-lg [&_.tiptap_pre]:bg-muted [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:font-mono [&_.tiptap_pre]:text-xs [&_.tiptap_pre]:mb-3 [&_.tiptap_pre]:overflow-x-auto
          [&_.tiptap_hr]:my-4 [&_.tiptap_hr]:border-border/60
          [&_.tiptap_strong]:font-semibold
          [&_.tiptap_em]:italic
          [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-start [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px bg-border/70" />;
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "grid size-7 place-items-center rounded transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        disabled && "pointer-events-none opacity-30"
      )}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <>
        <Loader2 className="size-3 animate-spin" />
        <span>Saving…</span>
      </>
    );
  }
  if (state === "saved") {
    return (
      <>
        <Check className="size-3 text-success" />
        <span className="text-success">Saved</span>
      </>
    );
  }
  return <span className="text-destructive">Save failed — try again</span>;
}
