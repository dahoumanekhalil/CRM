"use client";

import * as React from "react";
import type {
  BlockPropsByType,
  BlockType,
  LandingBlock,
  Theme,
} from "@/lib/landing-blocks/types";
import { BLOCK_REGISTRY } from "@/lib/landing-blocks/registry";

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `blk_${Math.random().toString(36).slice(2, 10)}`;
}

// A lightweight snapshot of the content used for undo/redo. Selection state
// is deliberately NOT part of history so undo doesn't jump the user's cursor.
interface Snapshot {
  blocks: LandingBlock[];
  theme: Theme;
}

const MAX_HISTORY = 50;

type Action =
  | { type: "select"; id: string | null }
  | { type: "add"; block: LandingBlock; at?: number }
  | { type: "remove"; id: string }
  | { type: "duplicate"; id: string }
  | { type: "reorder"; fromId: string; toId: string }
  | { type: "update"; id: string; props: BlockPropsByType[BlockType] }
  | { type: "updateTheme"; patch: Partial<Theme> }
  | { type: "hydrate"; blocks: LandingBlock[]; theme: Theme }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "markSaved" };

interface State {
  blocks: LandingBlock[];
  theme: Theme;
  selectedId: string | null;
  rev: number;
  savedRev: number;
  past: Snapshot[];
  future: Snapshot[];
}

// Push the current content to the undo stack before a mutating action.
function withHistory(state: State): State {
  const snapshot: Snapshot = { blocks: state.blocks, theme: state.theme };
  return {
    ...state,
    past: [...state.past.slice(-(MAX_HISTORY - 1)), snapshot],
    future: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return { ...state, selectedId: action.id };

    case "add": {
      const s = withHistory(state);
      const at = action.at ?? s.blocks.length;
      const next = [...s.blocks];
      next.splice(at, 0, action.block);
      return { ...s, blocks: next, selectedId: action.block.id, rev: s.rev + 1 };
    }

    case "remove": {
      const s = withHistory(state);
      const next = s.blocks.filter((b) => b.id !== action.id);
      const selected = s.selectedId === action.id ? null : s.selectedId;
      return { ...s, blocks: next, selectedId: selected, rev: s.rev + 1 };
    }

    case "duplicate": {
      const s = withHistory(state);
      const idx = s.blocks.findIndex((b) => b.id === action.id);
      if (idx === -1) return state;
      const source = s.blocks[idx];
      const clone = {
        ...source,
        id: newId(),
        props: structuredClone(source.props),
      } as LandingBlock;
      const next = [...s.blocks];
      next.splice(idx + 1, 0, clone);
      return { ...s, blocks: next, selectedId: clone.id, rev: s.rev + 1 };
    }

    case "reorder": {
      if (action.fromId === action.toId) return state;
      const s = withHistory(state);
      const from = s.blocks.findIndex((b) => b.id === action.fromId);
      const to = s.blocks.findIndex((b) => b.id === action.toId);
      if (from === -1 || to === -1) return state;
      const next = [...s.blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...s, blocks: next, rev: s.rev + 1 };
    }

    case "update": {
      const s = withHistory(state);
      const next = s.blocks.map((b) =>
        b.id === action.id
          ? ({ ...b, props: action.props } as LandingBlock)
          : b
      );
      return { ...s, blocks: next, rev: s.rev + 1 };
    }

    case "updateTheme": {
      const s = withHistory(state);
      return {
        ...s,
        theme: { ...s.theme, ...action.patch },
        rev: s.rev + 1,
      };
    }

    case "undo": {
      if (state.past.length === 0) return state;
      const snapshot = state.past[state.past.length - 1];
      const future: Snapshot[] = [
        { blocks: state.blocks, theme: state.theme },
        ...state.future,
      ].slice(0, MAX_HISTORY);
      return {
        ...state,
        blocks: snapshot.blocks,
        theme: snapshot.theme,
        past: state.past.slice(0, -1),
        future,
        // Mark dirty so autosave picks up the restored content.
        rev: state.rev + 1,
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const snapshot = state.future[0];
      const past: Snapshot[] = [
        ...state.past,
        { blocks: state.blocks, theme: state.theme },
      ].slice(-MAX_HISTORY);
      return {
        ...state,
        blocks: snapshot.blocks,
        theme: snapshot.theme,
        past,
        future: state.future.slice(1),
        rev: state.rev + 1,
      };
    }

    case "hydrate":
      return {
        blocks: action.blocks,
        theme: action.theme,
        selectedId: state.selectedId,
        rev: 0,
        savedRev: 0,
        past: [],
        future: [],
      };

    case "markSaved":
      return { ...state, savedRev: state.rev };

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

interface EditorContextValue {
  blocks: LandingBlock[];
  theme: Theme;
  selectedId: string | null;
  selectedBlock: LandingBlock | null;
  isDirty: boolean;
  rev: number;
  canUndo: boolean;
  canRedo: boolean;
  select: (id: string | null) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  reorderBlocks: (fromId: string, toId: string) => void;
  updateBlockProps: (id: string, props: BlockPropsByType[BlockType]) => void;
  updateTheme: (patch: Partial<Theme>) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const EditorContext = React.createContext<EditorContextValue | null>(null);

export function EditorProvider({
  initialBlocks,
  initialTheme,
  children,
}: {
  initialBlocks: LandingBlock[];
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(reducer, {
    blocks: initialBlocks,
    theme: initialTheme,
    selectedId: null,
    rev: 0,
    savedRev: 0,
    past: [],
    future: [],
  });

  const value = React.useMemo<EditorContextValue>(() => {
    const selectedBlock =
      state.blocks.find((b) => b.id === state.selectedId) ?? null;

    return {
      blocks: state.blocks,
      theme: state.theme,
      selectedId: state.selectedId,
      selectedBlock,
      isDirty: state.rev !== state.savedRev,
      rev: state.rev,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      select: (id) => dispatch({ type: "select", id }),
      addBlock: (type) => {
        const block = BLOCK_REGISTRY[type].createDefault(newId());
        dispatch({ type: "add", block });
      },
      removeBlock: (id) => dispatch({ type: "remove", id }),
      duplicateBlock: (id) => dispatch({ type: "duplicate", id }),
      reorderBlocks: (fromId, toId) =>
        dispatch({ type: "reorder", fromId, toId }),
      updateBlockProps: (id, props) => dispatch({ type: "update", id, props }),
      updateTheme: (patch) => dispatch({ type: "updateTheme", patch }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      markSaved: () => dispatch({ type: "markSaved" }),
    };
  }, [state]);

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
