"use client";

import * as React from "react";

export type Dir = "ltr" | "rtl";

const STORAGE_KEY = "webscale.dir.v1";
const DEFAULT_DIR: Dir = "ltr";

// Module-level cache so all subscribers share one value.
let cachedDir: Dir | null = null;

function readFromStorage(): Dir {
  if (typeof window === "undefined") return DEFAULT_DIR;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "rtl" || raw === "ltr") return raw;
  } catch {
    // storage disabled
  }
  return DEFAULT_DIR;
}

function writeToStorage(dir: Dir) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, dir);
  } catch {
    // storage disabled
  }
}

function getSnapshot(): Dir {
  if (cachedDir === null) cachedDir = readFromStorage();
  return cachedDir;
}

function getServerSnapshot(): Dir {
  return DEFAULT_DIR;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedDir = readFromStorage();
    for (const l of listeners) l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function applyToDocument(dir: Dir) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("dir", dir);
  // Also flip the lang attribute so screen readers know the script direction.
  document.documentElement.setAttribute("lang", dir === "rtl" ? "ar" : "en");
}

export function setDirection(dir: Dir) {
  cachedDir = dir;
  writeToStorage(dir);
  applyToDocument(dir);
  for (const l of listeners) l();
}

export function useDirection(): [Dir, (dir: Dir) => void] {
  const dir = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Apply to the document whenever the value changes client-side.
  React.useEffect(() => {
    applyToDocument(dir);
  }, [dir]);

  return [dir, setDirection];
}
