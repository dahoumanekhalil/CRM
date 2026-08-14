"use client";

import { useDirection } from "@/lib/use-direction";
import { Button } from "@/components/ui/button";

// A two-state toggle: LTR (English layout) ↔ RTL (Arabic layout).
// Shows "AR" in LTR mode (click to switch to Arabic/RTL) and
// "EN" in RTL mode (click to switch back). Simple and unambiguous.
export function DirectionToggle() {
  const [dir, setDir] = useDirection();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setDir(dir === "ltr" ? "rtl" : "ltr")}
      aria-label={dir === "ltr" ? "Switch to Arabic (RTL)" : "Switch to English (LTR)"}
      title={dir === "ltr" ? "Switch to Arabic layout" : "Switch to English layout"}
      className="h-9 w-12 font-mono text-sm font-medium tracking-wider"
    >
      {dir === "ltr" ? "AR" : "EN"}
    </Button>
  );
}
