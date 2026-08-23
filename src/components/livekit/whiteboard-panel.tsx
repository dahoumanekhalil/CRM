"use client";

import "tldraw/tldraw.css";

import * as React from "react";
import { Tldraw } from "tldraw";
import type { Editor, TLEditorSnapshot, TLUiAssetUrlOverrides } from "tldraw";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

// ── Self-hosted asset URLs ─────────────────────────────────────────────────────
// tldraw v5 loads icons/fonts from cdn.tldraw.com, which the app's service-
// worker CSP blocks.  We downloaded all assets to public/tldraw/ via
// scripts/download-tldraw-assets.mjs and point tldraw here instead.
//
// Icon names are the exact 163 entries from tldraw's iconTypes (v5.3.2).

const TLDRAW_ICON_NAMES = [
  "align-bottom","align-center-horizontal","align-center-vertical","align-left",
  "align-right","align-top","alt","arrow-arc","arrow-cycle","arrow-elbow",
  "arrow-left","arrowhead-arrow","arrowhead-bar","arrowhead-diamond","arrowhead-dot",
  "arrowhead-none","arrowhead-square","arrowhead-triangle-inverted","arrowhead-triangle",
  "blob","bold","bookmark","bring-forward","bring-to-front","broken","bulletList",
  "check-circle","check","chevron-down","chevron-left","chevron-right","chevron-up",
  "chevrons-ne","chevrons-sw","clipboard-copied","clipboard-copy","closed","code",
  "color","comment","corners","crop","cross-2","cross-circle","dash-dashed",
  "dash-dotted","dash-draw","dash-solid","disconnected","discord",
  "distribute-horizontal","distribute-vertical","dot","dots-horizontal","dots-vertical",
  "download","drag-handle-dots","duplicate","edit","external-link","fill-fill",
  "fill-lined-fill","fill-none","fill-pattern","fill-semi","fill-solid","follow",
  "following","font-draw","font-mono","font-sans","font-serif","geo-arrow-down",
  "geo-arrow-left","geo-arrow-right","geo-arrow-up","geo-check-box","geo-cloud",
  "geo-diamond","geo-ellipse","geo-heart","geo-hexagon","geo-octagon","geo-oval",
  "geo-pentagon","geo-rectangle","geo-rhombus-2","geo-rhombus","geo-star",
  "geo-trapezoid","geo-triangle","geo-x-box","github","group","heading","help-circle",
  "highlight","horizontal-align-end","horizontal-align-middle","horizontal-align-start",
  "info-circle","italic","leading","link","list","lock","manual","menu","minus",
  "mixed","pack","plus","question-mark-circle","question-mark","redo","reset-zoom",
  "rotate-ccw","rotate-cw","send-backward","send-to-back","share-1","size-extra-large",
  "size-large","size-medium","size-small","spline-cubic","spline-line",
  "stack-horizontal","stack-vertical","status-offline","stretch-horizontal",
  "stretch-vertical","strike","text-align-center","text-align-left","text-align-right",
  "toggle-off","toggle-on","tool-arrow","tool-eraser","tool-frame","tool-hand",
  "tool-highlight","tool-laser","tool-line","tool-media","tool-note","tool-pencil",
  "tool-pointer","tool-screenshot","tool-text","trash","twitter","underline","undo",
  "ungroup","unlock","vertical-align-end","vertical-align-middle","vertical-align-start",
  "warning-triangle","zoom-in","zoom-out",
] as const;

const LOCAL_BASE = "/tldraw";

const LOCAL_ASSET_URLS: TLUiAssetUrlOverrides = {
  icons: Object.fromEntries(
    TLDRAW_ICON_NAMES.map((name) => [
      name,
      `${LOCAL_BASE}/icons/icon/0_merged.svg#${name}`,
    ])
  ),
  translations: { en: `${LOCAL_BASE}/translations/en.json` },
  embedIcons: {},
  fonts: {
    tldraw_mono: `${LOCAL_BASE}/fonts/IBMPlexMono-Medium.woff2`,
    tldraw_mono_italic: `${LOCAL_BASE}/fonts/IBMPlexMono-MediumItalic.woff2`,
    tldraw_mono_bold: `${LOCAL_BASE}/fonts/IBMPlexMono-Bold.woff2`,
    tldraw_mono_italic_bold: `${LOCAL_BASE}/fonts/IBMPlexMono-BoldItalic.woff2`,
    tldraw_serif: `${LOCAL_BASE}/fonts/IBMPlexSerif-Medium.woff2`,
    tldraw_serif_italic: `${LOCAL_BASE}/fonts/IBMPlexSerif-MediumItalic.woff2`,
    tldraw_serif_bold: `${LOCAL_BASE}/fonts/IBMPlexSerif-Bold.woff2`,
    tldraw_serif_italic_bold: `${LOCAL_BASE}/fonts/IBMPlexSerif-BoldItalic.woff2`,
    tldraw_sans: `${LOCAL_BASE}/fonts/IBMPlexSans-Medium.woff2`,
    tldraw_sans_italic: `${LOCAL_BASE}/fonts/IBMPlexSans-MediumItalic.woff2`,
    tldraw_sans_bold: `${LOCAL_BASE}/fonts/IBMPlexSans-Bold.woff2`,
    tldraw_sans_italic_bold: `${LOCAL_BASE}/fonts/IBMPlexSans-BoldItalic.woff2`,
    tldraw_draw: `${LOCAL_BASE}/fonts/Shantell_Sans-Informal_Regular.woff2`,
    tldraw_draw_italic: `${LOCAL_BASE}/fonts/Shantell_Sans-Informal_Regular_Italic.woff2`,
    tldraw_draw_bold: `${LOCAL_BASE}/fonts/Shantell_Sans-Informal_Bold.woff2`,
    tldraw_draw_italic_bold: `${LOCAL_BASE}/fonts/Shantell_Sans-Informal_Bold_Italic.woff2`,
  },
};

// ── Wire protocol ─────────────────────────────────────────────────────────────
// Messages sent over the LiveKit data channel to sync whiteboard state.
// Full-snapshot sync is simpler than diff-based sync for a Phase 1 POC and
// still fast enough: tldraw snapshots are typically < 50 KB.

type WBMessage =
  | { type: "wb_snapshot"; snapshot: TLEditorSnapshot }
  | { type: "wb_request" }; // new participant asks for current state

const ENC = new TextEncoder();
const DEC = new TextDecoder();

function encodeMsg(msg: WBMessage): Uint8Array<ArrayBuffer> {
  // TextEncoder.encode() always uses a regular (non-shared) ArrayBuffer in
  // practice; the cast tells TypeScript that explicitly.
  return ENC.encode(JSON.stringify(msg)) as unknown as Uint8Array<ArrayBuffer>;
}

function decodeMsg(payload: Uint8Array): WBMessage | null {
  try {
    const obj = JSON.parse(DEC.decode(payload)) as { type?: string };
    if (obj.type === "wb_snapshot" || obj.type === "wb_request") {
      return obj as WBMessage;
    }
    return null; // not a whiteboard message — ignore
  } catch {
    return null;
  }
}

// ── WhiteboardPanel ───────────────────────────────────────────────────────────

export function WhiteboardPanel() {
  const room = useRoomContext();
  const editorRef = React.useRef<Editor | null>(null);

  // ── Receive messages from remote participants ───────────────────────────────
  React.useEffect(() => {
    function onData(payload: Uint8Array) {
      const editor = editorRef.current;
      if (!editor) return;
      const msg = decodeMsg(payload);
      if (!msg) return;

      if (msg.type === "wb_snapshot") {
        // Wrap in mergeRemoteChanges so the user-source store listener
        // does NOT fire → no echo back to sender.
        editor.store.mergeRemoteChanges(() => {
          editor.loadSnapshot(msg.snapshot);
        });
      } else if (msg.type === "wb_request") {
        // A new participant asked for the current state — send it.
        const snapshot = editor.getSnapshot();
        void room.localParticipant
          .publishData(encodeMsg({ type: "wb_snapshot", snapshot }), {
            reliable: true,
          })
          .catch(() => {});
      }
    }

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  // ── Mount the tldraw editor ────────────────────────────────────────────────
  function handleMount(editor: Editor): (() => void) | void {
    editorRef.current = editor;

    // Request current whiteboard state from the room on first open.
    void room.localParticipant
      .publishData(encodeMsg({ type: "wb_request" }), { reliable: true })
      .catch(() => {});

    // Publish a debounced full snapshot whenever the local user makes changes.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unlistenStore = editor.store.listen(
      () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const snapshot = editor.getSnapshot();
          void room.localParticipant
            .publishData(encodeMsg({ type: "wb_snapshot", snapshot }), {
              reliable: true,
            })
            .catch(() => {});
        }, 300);
      },
      { source: "user", scope: "document" }
    );

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unlistenStore();
    };
  }

  return (
    <div className="absolute inset-0">
      <Tldraw onMount={handleMount} assetUrls={LOCAL_ASSET_URLS} />
    </div>
  );
}
