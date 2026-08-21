"use client";

import * as React from "react";
import { Copy, MousePointer, Trash2 } from "lucide-react";
import type { LandingBlock } from "@/lib/landing-blocks/types";
import { BLOCK_REGISTRY } from "@/lib/landing-blocks/registry";
import { cn } from "@/lib/utils";
import { useEditor } from "./editor-store";
import {
  BenefitsForm,
  CarouselForm,
  CountdownForm,
  CTAForm,
  CurriculumForm,
  FAQForm,
  FeaturesForm,
  FormForm,
  GalleryForm,
  HeroForm,
  InstructorForm,
  PricingForm,
  SocialProofForm,
  TestimonialsForm,
  TwoColumnForm,
  VideoForm,
} from "./inspector-forms";

export function Inspector() {
  const { selectedBlock, updateBlockProps, duplicateBlock, removeBlock } =
    useEditor();

  return (
    <aside className="flex h-full w-full flex-col border-s border-border/70 bg-background">
      {selectedBlock ? (
        <SelectedHeader
          block={selectedBlock}
          onDuplicate={() => duplicateBlock(selectedBlock.id)}
          onRemove={() => removeBlock(selectedBlock.id)}
        />
      ) : (
        <EmptyHeader />
      )}
      <div className="flex-1 overflow-y-auto">
        {selectedBlock ? (
          <BlockForm
            block={selectedBlock}
            onChange={(props) => updateBlockProps(selectedBlock.id, props)}
          />
        ) : (
          <EmptyBody />
        )}
      </div>
    </aside>
  );
}

function SelectedHeader({
  block,
  onDuplicate,
  onRemove,
}: {
  block: LandingBlock;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const meta = BLOCK_REGISTRY[block.type];
  const Icon = meta.icon;
  return (
    <header className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            {meta.label}
          </h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label="Duplicate" onClick={onDuplicate}>
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton label="Delete" onClick={onRemove} destructive>
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </header>
  );
}

function EmptyHeader() {
  return (
    <header className="border-b border-border/70 px-4 py-3">
      <h2 className="text-sm font-semibold tracking-tight">Properties</h2>
      <p className="text-xs text-muted-foreground">
        Select a block on the canvas to edit its content.
      </p>
    </header>
  );
}

function EmptyBody() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
        <MousePointer className="size-4" />
      </span>
      <p className="max-w-[220px] text-xs text-muted-foreground">
        Click any block in the preview to edit it here.
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded transition-colors",
        destructive
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function BlockForm({
  block,
  onChange,
}: {
  block: LandingBlock;
  onChange: (props: LandingBlock["props"]) => void;
}) {
  // Discriminated dispatch — each branch narrows props for TS.
  switch (block.type) {
    case "hero":
      return <HeroForm value={block.props} onChange={onChange} />;
    case "features":
      return <FeaturesForm value={block.props} onChange={onChange} />;
    case "instructor":
      return <InstructorForm value={block.props} onChange={onChange} />;
    case "pricing":
      return <PricingForm value={block.props} onChange={onChange} />;
    case "faq":
      return <FAQForm value={block.props} onChange={onChange} />;
    case "cta":
      return <CTAForm value={block.props} onChange={onChange} />;
    case "form":
      return <FormForm value={block.props} onChange={onChange} />;
    case "testimonials":
      return <TestimonialsForm value={block.props} onChange={onChange} />;
    case "benefits":
      return <BenefitsForm value={block.props} onChange={onChange} />;
    case "curriculum":
      return <CurriculumForm value={block.props} onChange={onChange} />;
    case "social-proof":
      return <SocialProofForm value={block.props} onChange={onChange} />;
    case "video":
      return <VideoForm value={block.props} onChange={onChange} />;
    case "gallery":
      return <GalleryForm value={block.props} onChange={onChange} />;
    case "carousel":
      return <CarouselForm value={block.props} onChange={onChange} />;
    case "countdown":
      return <CountdownForm value={block.props} onChange={onChange} />;
    case "two-column":
      return <TwoColumnForm value={block.props} onChange={onChange} />;
    default: {
      const _exhaustive: never = block;
      return null;
    }
  }
}
