import * as React from "react";
import type { LandingBlock, Theme } from "@/lib/landing-blocks/types";
import { HeroBlock } from "./hero";
import { FeaturesBlock } from "./features";
import { InstructorBlock } from "./instructor";
import { PricingBlock } from "./pricing";
import { FAQBlock } from "./faq";
import { CTABlock } from "./cta";
import { FormBlock } from "./form";
import { TestimonialsBlock } from "./testimonials";
import { BenefitsBlock } from "./benefits";
import { CurriculumBlock } from "./curriculum";
import { SocialProofBlock } from "./social-proof";
import { AnimatedSection } from "./animated-section";

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
    case "testimonials":
      return <TestimonialsBlock props={block.props} />;
    case "benefits":
      return <BenefitsBlock props={block.props} />;
    case "curriculum":
      return <CurriculumBlock props={block.props} />;
    case "social-proof":
      return <SocialProofBlock props={block.props} />;
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
  // When true, each block is wrapped in a scroll-triggered entrance animation.
  // Set only on the public /p/[slug] route — never in the CRM editor canvas.
  animated?: boolean;
}

// Wraps blocks in a themed shell. Sets a CSS variable that block components
// read via `var(--lp-primary, var(--primary))` — so themes cascade without
// coupling blocks to a specific provider.
export function PageRenderer({
  blocks,
  theme,
  className,
  landingPageId,
  animated = false,
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
      {blocks.map((block, index) =>
        animated ? (
          <AnimatedSection
            key={block.id}
            delay={Math.min(index * 0.05, 0.3)}
          >
            <BlockRenderer block={block} landingPageId={landingPageId} />
          </AnimatedSection>
        ) : (
          <BlockRenderer
            key={block.id}
            block={block}
            landingPageId={landingPageId}
          />
        )
      )}
    </div>
  );
}
