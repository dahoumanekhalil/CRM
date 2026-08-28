import { describe, it, expect } from "vitest";
import {
  assertTransition,
  transitionErrorMessage,
  LiveSessionTransitionError,
} from "@/lib/livekit/state-machine";

describe("assertTransition — valid transitions", () => {
  const valid: [string, string][] = [
    ["SCHEDULED", "LIVE"],
    ["SCHEDULED", "CANCELLED"],
    ["WAITING", "LIVE"],
    ["WAITING", "CANCELLED"],
    ["LIVE", "ENDED"],
    ["LIVE", "RECORDING_PROCESSING"],
    ["ENDED", "COMPLETED"],
    ["RECORDING_PROCESSING", "COMPLETED"],
  ];

  it.each(valid)("%s → %s does not throw", (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
  });
});

describe("assertTransition — invalid transitions", () => {
  const invalid: [string, string][] = [
    ["SCHEDULED", "ENDED"],
    ["SCHEDULED", "COMPLETED"],
    ["SCHEDULED", "RECORDING_PROCESSING"],
    ["WAITING", "COMPLETED"],
    ["WAITING", "ENDED"],
    ["LIVE", "SCHEDULED"],
    ["LIVE", "CANCELLED"],
    ["LIVE", "WAITING"],
    ["ENDED", "LIVE"],
    ["ENDED", "SCHEDULED"],
    ["ENDED", "CANCELLED"],
    ["RECORDING_PROCESSING", "LIVE"],
    ["RECORDING_PROCESSING", "CANCELLED"],
    ["COMPLETED", "LIVE"],
    ["COMPLETED", "SCHEDULED"],
    ["CANCELLED", "LIVE"],
    ["CANCELLED", "SCHEDULED"],
    ["UNKNOWN_STATUS", "LIVE"],
  ];

  it.each(invalid)("%s → %s throws LiveSessionTransitionError", (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(LiveSessionTransitionError);
  });

  it("error message includes source and target statuses", () => {
    expect(() => assertTransition("COMPLETED", "LIVE")).toThrowError(
      "Invalid live session transition: COMPLETED → LIVE"
    );
  });

  it("thrown error has name LiveSessionTransitionError", () => {
    let caught: unknown;
    try {
      assertTransition("CANCELLED", "LIVE");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(LiveSessionTransitionError);
    expect((caught as LiveSessionTransitionError).name).toBe(
      "LiveSessionTransitionError"
    );
  });

  it("terminal COMPLETED state rejects all further transitions", () => {
    for (const target of ["LIVE", "SCHEDULED", "WAITING", "ENDED", "CANCELLED", "RECORDING_PROCESSING"]) {
      expect(() => assertTransition("COMPLETED", target)).toThrow(LiveSessionTransitionError);
    }
  });

  it("terminal CANCELLED state rejects all further transitions", () => {
    for (const target of ["LIVE", "SCHEDULED", "WAITING", "ENDED", "COMPLETED", "RECORDING_PROCESSING"]) {
      expect(() => assertTransition("CANCELLED", target)).toThrow(LiveSessionTransitionError);
    }
  });
});

describe("transitionErrorMessage", () => {
  it("LIVE → CANCELLED returns specific cancel-during-live message", () => {
    expect(transitionErrorMessage("LIVE", "CANCELLED")).toBe(
      "A live session cannot be cancelled. End the session first."
    );
  });

  it("CANCELLED → anything mentions terminal state", () => {
    expect(transitionErrorMessage("CANCELLED", "LIVE")).toMatch(/terminal state/);
  });

  it("COMPLETED → anything mentions terminal state", () => {
    expect(transitionErrorMessage("COMPLETED", "LIVE")).toMatch(/terminal state/);
  });

  it("other invalid transitions return generic message containing both statuses", () => {
    const msg = transitionErrorMessage("SCHEDULED", "ENDED");
    expect(msg).toContain("SCHEDULED");
    expect(msg).toContain("ENDED");
  });

  it("WAITING → COMPLETED returns generic message", () => {
    const msg = transitionErrorMessage("WAITING", "COMPLETED");
    expect(msg).toContain("WAITING");
    expect(msg).toContain("COMPLETED");
  });
});
