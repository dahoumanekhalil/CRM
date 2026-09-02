"use client";

import * as React from "react";

// SSR-safe localStorage state. Reads once on mount to avoid hydration mismatch:
// the first client render matches the server (returns `initial`), then a layout
// effect swaps in the persisted value if one exists.
export function useLocalStorage<T>(
  key: string,
  initial: T,
  parse: (raw: string) => T = JSON.parse,
  serialize: (value: T) => string = JSON.stringify,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = React.useState<T>(initial);

  // SSR hydration pattern: read stored value once on mount and swap it in.
  // The setState here fires at most once per mount, so it does not cascade —
  // it's the standard hop from "server default" to "client-persisted value".
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw !== null) setValue(parse(raw));
    } catch {
      // ignore quota / disabled storage — fall back to `initial`
    }
    // key/parse are stable in practice; deps kept minimal on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setAndPersist = React.useCallback<(value: T | ((prev: T) => T)) => void>(
    (next) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, serialize(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [key, serialize],
  );

  return [value, setAndPersist];
}
