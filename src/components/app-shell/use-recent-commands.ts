"use client";

import * as React from "react";

const STORAGE_KEY = "webscale.command-recents.v1";
const MAX_RECENTS = 5;

type RecentIds = string[];

function readFromStorage(): RecentIds {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((v): v is string => typeof v === "string")
      .slice(0, MAX_RECENTS);
  } catch {
    return EMPTY;
  }
}

function writeToStorage(ids: RecentIds) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage full / disabled — silent, recents are a nice-to-have.
  }
}

// Stable empty reference — useSyncExternalStore requires a stable snapshot
// when nothing has changed, otherwise React tears every render.
const EMPTY: RecentIds = [];

// Cached snapshot; updated by our own writes and by `storage` events fired
// when another tab writes to the same key.
let cachedSnapshot: RecentIds | null = null;

function getSnapshot(): RecentIds {
  if (cachedSnapshot === null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): RecentIds {
  return EMPTY;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedSnapshot = readFromStorage();
    for (const l of listeners) l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateRecents(next: RecentIds) {
  cachedSnapshot = next;
  writeToStorage(next);
  for (const l of listeners) l();
}

export function useRecentCommands() {
  const recents = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const push = React.useCallback((id: string) => {
    const current = cachedSnapshot ?? readFromStorage();
    const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENTS);
    updateRecents(next);
  }, []);

  const clear = React.useCallback(() => {
    updateRecents(EMPTY);
  }, []);

  return { recents, push, clear };
}
