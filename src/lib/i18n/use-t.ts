"use client";

import { useDirection } from "@/lib/use-direction";
import { ar } from "./dict";

// Returns a translation function `t(key)` that maps English UI strings to
// Arabic when the app is in RTL/Arabic mode. Falls back to the key unchanged
// for any string not in the dictionary — so English always works as default.
export function useT() {
  const [dir] = useDirection();
  return (key: string): string => {
    if (dir !== "rtl") return key;
    return ar[key] ?? key;
  };
}
