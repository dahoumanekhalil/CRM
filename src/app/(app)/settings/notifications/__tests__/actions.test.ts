// TASK 24.1 — Authentication tests for notification self-service actions

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  telegramConnection: { findUnique: vi.fn() },
  telegramLinkToken: { count: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  telegramConnectionAudit: { create: vi.fn() },
  notificationPreference: { upsert: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

const mockRequirePermission = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-guards", () => ({ requirePermissionAction: mockRequirePermission }));
vi.mock("@/lib/notifications/preferences", () => ({
  ensureDefaultPreferences: vi.fn().mockResolvedValue(undefined),
  getPreferencesMap: vi.fn().mockResolvedValue({}),
}));

import {
  getTelegramStatus,
  generateLinkToken,
  disconnectTelegram,
  setNotificationPreference,
} from "../actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_SESSION = { user: { id: "user-1", role: "EMPLOYEE" } };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_USERNAME = "testbot";
  mockPrisma.telegramLinkToken.count.mockResolvedValue(0);
  mockPrisma.telegramLinkToken.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.telegramLinkToken.create.mockResolvedValue({});
  mockPrisma.telegramConnectionAudit.create.mockResolvedValue({});
  mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

// ── TASK 24.1 — Authentication ────────────────────────────────────────────────

describe("24.1 — Notification actions authentication", () => {
  it("getTelegramStatus: unauthenticated is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(getTelegramStatus()).rejects.toThrow("Forbidden");
  });

  it("generateLinkToken: unauthenticated is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(generateLinkToken()).rejects.toThrow("Forbidden");
  });

  it("disconnectTelegram: unauthenticated is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(disconnectTelegram()).rejects.toThrow("Forbidden");
  });

  it("setNotificationPreference: unauthenticated is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(setNotificationPreference("task.reminder", true)).rejects.toThrow("Forbidden");
  });
});

// ── getTelegramStatus ─────────────────────────────────────────────────────────

describe("getTelegramStatus", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(USER_SESSION); });

  it("returns connected:false with null disconnectReason when no connection exists", async () => {
    mockPrisma.telegramConnection.findUnique.mockResolvedValue(null);
    const result = await getTelegramStatus();
    expect(result.connected).toBe(false);
    if (!result.connected) expect(result.disconnectReason).toBeNull();
  });

  it("returns connected:true with username when CONNECTED", async () => {
    mockPrisma.telegramConnection.findUnique.mockResolvedValue({ status: "CONNECTED", username: "alice_tg" });
    const result = await getTelegramStatus();
    expect(result.connected).toBe(true);
    if (result.connected) expect(result.username).toBe("alice_tg");
  });

  it("returns disconnectReason:BLOCKED when connection is BLOCKED", async () => {
    mockPrisma.telegramConnection.findUnique.mockResolvedValue({ status: "BLOCKED", username: null });
    const result = await getTelegramStatus();
    expect(result.connected).toBe(false);
    if (!result.connected) expect(result.disconnectReason).toBe("BLOCKED");
  });

  it("returns disconnectReason:REVOKED when connection is REVOKED", async () => {
    mockPrisma.telegramConnection.findUnique.mockResolvedValue({ status: "REVOKED", username: null });
    const result = await getTelegramStatus();
    expect(result.connected).toBe(false);
    if (!result.connected) expect(result.disconnectReason).toBe("REVOKED");
  });

  it("returns disconnectReason:DISABLED when connection is DISABLED", async () => {
    mockPrisma.telegramConnection.findUnique.mockResolvedValue({ status: "DISABLED", username: null });
    const result = await getTelegramStatus();
    expect(result.connected).toBe(false);
    if (!result.connected) expect(result.disconnectReason).toBe("DISABLED");
  });
});

// ── generateLinkToken (self-service) ─────────────────────────────────────────

describe("generateLinkToken — self-service", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(USER_SESSION); });

  it("succeeds and returns a 6-char token with botUrl", async () => {
    const result = await generateLinkToken();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.token).toHaveLength(10);
      expect(result.data.botUrl).toContain("testbot");
    }
  });

  it("rate limit: blocks after 5 tokens in an hour", async () => {
    mockPrisma.telegramLinkToken.count.mockResolvedValue(5);
    const result = await generateLinkToken();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too many/i);
  });

  it("requires notifications.write permission", async () => {
    await generateLinkToken();
    expect(mockRequirePermission).toHaveBeenCalledWith("notifications.write");
  });
});

// ── 24.1 — Correct permission strings ────────────────────────────────────────

describe("24.1 — Correct permission strings", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(USER_SESSION); });

  it("getTelegramStatus requires notifications.view", async () => {
    mockPrisma.telegramConnection.findUnique.mockResolvedValue(null);
    await getTelegramStatus();
    expect(mockRequirePermission).toHaveBeenCalledWith("notifications.view");
  });

  it("disconnectTelegram requires notifications.write", async () => {
    // Override $transaction to skip internals — we only care the permission check ran
    mockPrisma.$transaction.mockResolvedValueOnce([]);
    await disconnectTelegram();
    expect(mockRequirePermission).toHaveBeenCalledWith("notifications.write");
  });
});

// ── 24.5 — Security ──────────────────────────────────────────────────────────

describe("24.5 — Token security (self-service)", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(USER_SESSION); });

  it("generated token only contains chars from the safe alphabet (no special chars)", async () => {
    const result = await generateLinkToken();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.token).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
    }
  });

  it("two consecutive tokens are different (non-deterministic entropy)", async () => {
    const r1 = await generateLinkToken();
    const r2 = await generateLinkToken();
    if (r1.ok && r2.ok) {
      expect(r1.data.token).not.toBe(r2.data.token);
    }
  });

  it("token is always created for the session user — not an arbitrary ID (IDOR prevention)", async () => {
    await generateLinkToken();
    expect(mockPrisma.telegramLinkToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ employeeId: USER_SESSION.user.id }),
      }),
    );
  });

  it("no DB is accessed before auth check — auth gates all data operations", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(generateLinkToken()).rejects.toThrow("Forbidden");
    expect(mockPrisma.telegramLinkToken.count).not.toHaveBeenCalled();
    expect(mockPrisma.telegramLinkToken.create).not.toHaveBeenCalled();
  });
});

// ── setNotificationPreference ─────────────────────────────────────────────────

describe("setNotificationPreference", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(USER_SESSION); });

  it("rejects an invalid notification type", async () => {
    // @ts-expect-error intentionally invalid
    const result = await setNotificationPreference("not.a.real.type", true);
    expect(result.ok).toBe(false);
  });

  it("accepts a valid type and calls upsert", async () => {
    mockPrisma.notificationPreference.upsert.mockResolvedValue({});
    const result = await setNotificationPreference("task.reminder", false);
    expect(result.ok).toBe(true);
    expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalled();
  });
});
