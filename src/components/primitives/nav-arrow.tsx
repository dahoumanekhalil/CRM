// Directional arrow that automatically mirrors in RTL.
// Use this wherever an arrow implies "go back" or "go forward".
//
// ArrowLeft used as "back" → points left in LTR, right in RTL.
// ArrowRight used as "forward" → points right in LTR, left in RTL.
// Both variants simply rotate 180° via the Tailwind `rtl:` variant.

import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArrowProps {
  className?: string;
}

export function BackArrow({ className }: ArrowProps) {
  return <ArrowLeft className={cn("rtl:rotate-180", className)} />;
}

export function ForwardArrow({ className }: ArrowProps) {
  return <ArrowRight className={cn("rtl:rotate-180", className)} />;
}
