import { describe, it, expect } from "vitest";
// env vars (LIVEKIT_API_KEY / LIVEKIT_API_SECRET) are injected by vitest.config.ts
// server-only is mocked globally in src/test/setup.ts
import { validateRoomName } from "@/lib/livekit/token";

describe("validateRoomName", () => {
  const valid = [
    "room-123",
    "ROOM_abc",
    "session_2026_01",
    "a",
    "abcdefghijklmnopqrstuvwxyzABCDE",
    "a".repeat(50),
  ];

  it.each(valid)('accepts valid name "%s"', (name) => {
    expect(() => validateRoomName(name)).not.toThrow();
  });

  const invalid: [string, string][] = [
    ["", "empty string"],
    ["room name", "contains space"],
    ["room.name", "contains dot"],
    ["room@name", "contains @"],
    ["a".repeat(51), "51 characters (max is 50)"],
    ["room/session", "contains slash"],
    ["<script>", "contains angle brackets"],
  ];

  it.each(invalid)('rejects "%s" (%s)', (name) => {
    expect(() => validateRoomName(name)).toThrow(
      /Invalid room name/
    );
  });

  it("error message explains allowed characters", () => {
    expect(() => validateRoomName("bad name")).toThrowError(
      /letters, numbers, hyphens, and underscores/
    );
  });

  it("error message mentions 50 character limit", () => {
    expect(() => validateRoomName("a".repeat(51))).toThrowError(/50/);
  });
});
