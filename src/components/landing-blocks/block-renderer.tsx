import * as React from "react";
import type { LandingBlock, Theme } from "@/lib/landing-blocks/types";
import { HeroBlock } from "./hero";
import { FeaturesBlock } from "./features";
import { InstructorBlock } from "./instructor";
import { PricingBlock } from "./pricing";
import { FAQBlock } from "./faq";
import { CTABlock } from "./cta";
import { FormBlock } from "./form";

// Dispatch on discriminated union — TS narrows correctly per case.
export function BlockRenderer({
  block,
  landingPageId,
}: {
  block: LandingBlock;
  landingPageId?: string | null;
}) {
  switch (block.type) {
    case "hero":
      return <HeroBlock props={block.props} />;
    case "features":
      return <FeaturesBlock props={block.props} />;
    case "instructor":
      return <InstructorBlock props={block.props} />;
    case "pricing":
      return <PricingBlock props={block.props} />;
    case "faq":
      return <FAQBlock props={block.props} />;
    case "cta":
      return <CTABlock props={block.props} />;
    case "form":
      return <FormBlock props={block.props} landingPageId={landingPageId} />;
    default: {
      const _exhaustive: never = block;
      return null;
    }
  }
}

interface PageRendererProps {
  blocks: LandingBlock[];
  theme?: Theme;
  className?: string;
  // Passed on the public /p/[slug] route so form blocks know where to POST.
  // Omitted (or null) in the CRM preview — the form renders but submit is disabled.
  landingPageId?: string | null;
}

// Wraps blocks in a themed shell. Sets a CSS variable that block components
// read via `var(--lp-primary, var(--primary))` — so themes cascade without
// coupling blocks to a specific provider.
export function PageRenderer({
  blocks,
  theme,
  className,
  landingPageId,
}: PageRendererProps) {
  const style: React.CSSProperties = {};
  if (theme?.primary) {
    (style as Record<string, string>)["--lp-primary"] = theme.primary;
  }

  return (
    <div
      className={className}
      style={style}
      dir="ltr"
    >
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          landingPageId={landingPageId}
        />
      ))}
    </div>
  );
}
