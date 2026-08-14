"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
  showShortcut?: boolean;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  containerClassName,
  showShortcut,
  debounceMs = 250,
  className,
  ...props
}: SearchInputProps) {
  const [local, setLocal] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  const emit = React.useCallback(
    (v: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onChange(v), debounceMs);
    },
    [onChange, debounceMs]
  );

  return (
    <div
      className={cn(
        "group relative flex h-9 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40 focus-within:border-ring",
        containerClassName
      )}
    >
      <Search className="pointer-events-none absolute start-3 size-4 text-muted-foreground" />
      <input
        type="search"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          emit(e.target.value);
        }}
        placeholder={placeholder}
        className={cn(
          "peer h-full w-full bg-transparent px-9 text-sm outline-none placeholder:text-muted-foreground",
          className
        )}
        {...props}
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          className="absolute end-2.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : showShortcut ? (
        <Kbd className="absolute end-2.5">/</Kbd>
      ) : null}
    </div>
  );
}
