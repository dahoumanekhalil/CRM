"use client";

import * as React from "react";
import { toast } from "sonner";
import type { LandingBlock, Theme } from "@/lib/landing-blocks/types";
import { updateLandingPageContent } from "../../actions";
import type { SaveState } from "./save-status";

// Debounced autosave. Fires 1000ms after the last edit; skips if nothing dirty.
// Also flushes on unmount so a quick edit + navigate doesn't lose content.
export function useAutosave({
  id,
  blocks,
  theme,
  isDirty,
  rev,
  onSaved,
}: {
  id: string;
  blocks: LandingBlock[];
  theme: Theme;
  isDirty: boolean;
  rev: number;
  onSaved: () => void;
}) {
  const [state, setState] = React.useState<SaveState>("idle");
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const latestRef = React.useRef({ blocks, theme, rev });
  const inFlightRevRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    latestRef.current = { blocks, theme, rev };
  }, [blocks, theme, rev]);

  const flush = React.useCallback(async () => {
    const snapshot = latestRef.current;
    if (inFlightRevRef.current === snapshot.rev) return;
    inFlightRevRef.current = snapshot.rev;
    setState("saving");
    const res = await updateLandingPageContent({
      id,
      blocks: snapshot.blocks,
      theme: snapshot.theme,
    });
    if (!res.ok) {
      setState("error");
      toast.error(res.error);
      inFlightRevRef.current = null;
      return;
    }
    // If the user edited again while the request was in flight, keep the
    // dirty state on next render — the effect below will schedule another save.
    if (latestRef.current.rev !== snapshot.rev) {
      inFlightRevRef.current = null;
      onSaved();
      // Trigger another cycle by leaving state as "saving" briefly.
      setState("saving");
      return;
    }
    setSavedAt(new Date(res.data.savedAt));
    setState("saved");
    onSaved();
    inFlightRevRef.current = null;
  }, [id, onSaved]);

  React.useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void flush();
    }, 1000);
    return () => clearTimeout(t);
  }, [isDirty, rev, flush]);

  // Flush on unmount (best-effort) if still dirty.
  React.useEffect(() => {
    return () => {
      if (latestRef.current.rev !== inFlightRevRef.current) {
        void flush();
      }
    };
    // Intentional: flush ref captures latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, savedAt, flush };
}
