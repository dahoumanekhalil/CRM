// Valid transitions for the LiveSession status field.
// Every status-changing server action and webhook handler must go through
// assertTransition() before writing to the DB.

const VALID_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  SCHEDULED:            new Set(["LIVE", "CANCELLED"]),
  WAITING:              new Set(["LIVE", "CANCELLED"]),
  LIVE:                 new Set(["ENDED", "RECORDING_PROCESSING"]),
  ENDED:                new Set(["COMPLETED"]),  // recording finished after the session ended
  RECORDING_PROCESSING: new Set(["COMPLETED"]),
  COMPLETED:            new Set(),               // terminal
  CANCELLED:            new Set(),               // terminal
};

export class LiveSessionTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid live session transition: ${from} → ${to}`);
    this.name = "LiveSessionTransitionError";
  }
}

/**
 * Throws LiveSessionTransitionError if `from → to` is not in the valid transition map.
 * Call this before every DB status update to enforce the state machine.
 */
export function assertTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed?.has(to)) {
    throw new LiveSessionTransitionError(from, to);
  }
}

/** Human-readable error message for a rejected transition — safe to surface to users. */
export function transitionErrorMessage(from: string, to: string): string {
  if (from === "LIVE" && to === "CANCELLED") {
    return "A live session cannot be cancelled. End the session first.";
  }
  if (from === "CANCELLED" || from === "COMPLETED") {
    return "This session has already reached a terminal state and cannot be changed.";
  }
  return `Cannot transition from ${from} to ${to}.`;
}
