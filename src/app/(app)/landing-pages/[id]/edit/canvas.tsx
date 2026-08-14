"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Copy,
  GripVertical,
  MousePointer,
  Trash2,
} from "lucide-react";

import { BLOCK_REGISTRY, BLOCK_LIST } from "@/lib/landing-blocks/registry";
import { BlockRenderer } from "@/components/landing-blocks/block-renderer";
import type { LandingBlock } from "@/lib/landing-blocks/types";
import { cn } from "@/lib/utils";
import { useEditor } from "./editor-store";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

export function Canvas({ device }: { device: Device }) {
  const {
    blocks,
    theme,
    selectedId,
    select,
    reorderBlocks,
    removeBlock,
    duplicateBlock,
    addBlock,
  } = useEditor();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  // Deselect when clicking the empty canvas background.
  const onBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) select(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // arrayMove is used for the visual — but our reducer only cares about IDs.
    const fromIdx = blocks.findIndex((b) => b.id === active.id);
    const toIdx = blocks.findIndex((b) => b.id === over.id);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = arrayMove(blocks, fromIdx, toIdx);
    void moved;
    reorderBlocks(String(active.id), String(over.id));
  };

  return (
    <div
      className="flex-1 overflow-auto bg-muted/40 p-6"
      onClick={onBackgroundClick}
    >
      <div
        className={cn(
          "mx-auto rounded-xl border border-border/70 bg-background shadow-sm transition-all",
          device !== "desktop" && "shadow-lg"
        )}
        style={{
          width: DEVICE_WIDTHS[device],
          maxWidth: "100%",
        }}
      >
        {blocks.length === 0 ? (
          <EmptyCanvas onAddHero={() => addBlock("hero")} />
        ) : (
          <div
            style={
              theme?.primary
                ? ({
                    ["--lp-primary" as string]: theme.primary,
                  } as React.CSSProperties)
                : undefined
            }
            dir="ltr"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    isSelected={block.id === selectedId}
                    onSelect={() => select(block.id)}
                    onDuplicate={() => duplicateBlock(block.id)}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableBlock({
  block,
  isSelected,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  block: LandingBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const meta = BLOCK_REGISTRY[block.type];
  const Icon = meta.icon;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/block relative isolate",
        isDragging && "z-10 opacity-70"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Selection outline */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-sm ring-inset transition-shadow",
          isSelected
            ? "ring-2 ring-primary"
            : "ring-1 ring-transparent group-hover/block:ring-primary/40"
        )}
      />

      {/* Block chrome (label + actions) — only visible when selected or hovered */}
      <div
        className={cn(
          "absolute start-3 top-3 z-20 flex items-center gap-1 rounded-md border border-border/70 bg-background/95 px-1 py-0.5 shadow-sm backdrop-blur transition-opacity",
          isSelected
            ? "opacity-100"
            : "opacity-0 group-hover/block:opacity-100"
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="grid size-7 cursor-grab place-items-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="flex items-center gap-1.5 px-1.5 text-xs font-medium text-foreground">
          <Icon className="size-3.5" />
          {meta.label}
        </span>
        <span className="mx-0.5 h-4 w-px bg-border/70" />
        <button
          type="button"
          aria-label="Duplicate block"
          title="Duplicate"
          className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete block"
          title="Delete"
          className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <BlockRenderer block={block} />
    </div>
  );
}

function EmptyCanvas({ onAddHero }: { onAddHero: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-16 text-center">
      <span className="grid size-14 place-items-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
        <MousePointer className="size-6" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight">Start your page</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Pick a block from the left panel, or start with a hero.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddHero}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 text-sm font-medium hover:bg-muted/60"
      >
        Add hero block
      </button>
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        {BLOCK_LIST.slice(1).map((meta) => (
          <span
            key={meta.type}
            className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5"
          >
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}
