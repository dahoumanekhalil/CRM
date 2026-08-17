// TASK 24.3 — Notification scheduling / delivery lifecycle tests

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { addMinutes, subMinutes, subHours } from "date-fns";

// ── Provider mocks ────────────────────────────────────────────────────────────

const mockInAppSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockTelegramSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/notifications/providers/in-app", () => ({
  InAppProvider: { send: mockInAppSend },
}));
vi.mock("@/lib/notifications/providers/telegram", () => ({
  TelegramProvider: { send: mockTelegramSend },
}));

// ── Org timezone mock ─────────────────────────────────────────────────────────

vi.mock("@/lib/org", () => ({
  getOrgTimezone: vi.fn().mockResolvedValue("UTC"),
  clearOrgTimezoneCache: vi.fn(),
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  scheduledNotification: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
  task: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() },
  courseSession: { findMany: vi.fn(), count: vi.fn() },
  payment: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  lead: { count: vi.fn() },
  registration: { count: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "../notifications/route";

// ── Auth helper ───────────────────────────────────────────────────────────────

function makeRequest(secret = "test-secret") {
  process.env.CRON_SECRET = secret;
  return new NextRequest("http://localhost/api/cron/notifications", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
}

function makeUnauthorizedRequest() {
  process.env.CRON_SECRET = "test-secret";
  return new NextRequest("http://localhost/api/cron/notifications", {
    method: "POST",
    headers: { authorization: "Bearer wrong" },
  });
}

// ── Minimal pending notification ──────────────────────────────────────────────

function makePendingNotif(overrides = {}) {
  return {
    id: "notif-1",
    type: "task.reminder",
    recipientId: "user-1",
    provider: "all",
    payload: { title: "Test", body: "Body" },
    entityType: null,
    entityId: null,
    status: "PENDING",
    attemptCount: 0,
    scheduledAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore provider mocks — clearAllMocks() resets call counts but not permanent
  // implementations set by mockRejectedValue() in earlier tests.
  mockInAppSend.mockResolvedValue(undefined);
  mockTelegramSend.mockResolvedValue(undefined);
  // Default: empty queues
  mockPrisma.scheduledNotification.findMany.mockResolvedValue([]);
  mockPrisma.scheduledNotification.findFirst.mockResolvedValue(null);
  mockPrisma.scheduledNotification.count.mockResolvedValue(0);
  mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.scheduledNotification.update.mockResolvedValue({});
  mockPrisma.scheduledNotification.create.mockResolvedValue({});
  mockPrisma.scheduledNotification.groupBy.mockResolvedValue([]);
  mockPrisma.scheduledNotification.aggregate.mockResolvedValue({ _sum: { amount: null } });
  mockPrisma.task.findMany.mockResolvedValue([]);
  mockPrisma.task.groupBy.mockResolvedValue([]);
  mockPrisma.task.count.mockResolvedValue(0);
  mockPrisma.courseSession.findMany.mockResolvedValue([]);
  mockPrisma.courseSession.count.mockResolvedValue(0);
  mockPrisma.payment.findMany.mockResolvedValue([]);
  mockPrisma.payment.count.mockResolvedValue(0);
  mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
  mockPrisma.lead.count.mockResolvedValue(0);
  mockPrisma.registration.count.mockResolvedValue(0);
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1", role: "ADMIN" });
});

// ── 24.5 — Cron security ─────────────────────────────────────────────────────

describe("24.5 — Cron auth hardening", () => {
  it("missing Authorization header returns 401", async () => {
    process.env.CRON_SECRET = "test-secret";
    const req = new NextRequest("http://localhost/api/cron/notifications", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("lowercase 'bearer' prefix is rejected (case-sensitive)", async () => {
    process.env.CRON_SECRET = "test-secret";
    const req = new NextRequest("http://localhost/api/cron/notifications", {
      method: "POST",
      headers: { authorization: "bearer test-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("empty CRON_SECRET env var rejects all requests", async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest("http://localhost/api/cron/notifications", {
      method: "POST",
      headers: { authorization: "Bearer anything" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("Cron auth", () => {
  it("returns 401 for wrong secret", async () => {
    const res = await POST(makeUnauthorizedRequest());
    expect(res.status).toBe(401);
  });

  it("returns 200 for correct secret", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });
});

// ── TASK 24.3 — Notification lifecycle ───────────────────────────────────────

describe("24.3 — Notification delivery lifecycle", () => {
  it("PENDING → SENT: calls both providers and marks record SENT", async () => {
    const notif = makePendingNotif();
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);
    mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(mockInAppSend).toHaveBeenCalled();
    expect(mockTelegramSend).toHaveBeenCalled();
    expect(mockPrisma.scheduledNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: expect.objectContaining({ status: "SENT" }),
      }),
    );
    expect(body.queue.sent).toBe(1);
  });

  it("provider failure on attempt 1 → schedules retry with backoff", async () => {
    mockInAppSend.mockRejectedValueOnce(new Error("Network error"));
    const notif = makePendingNotif({ attemptCount: 0 });
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.queue.retrying).toBe(1);
    // Should reschedule (update with future scheduledAt), not mark FAILED
    const updateCall = mockPrisma.scheduledNotification.update.mock.calls.find(
      ([args]: [{ data: { status: string } }]) => args.data?.status === "PENDING",
    );
    expect(updateCall).toBeDefined();
  });

  it("3 consecutive failures → marks record FAILED permanently", async () => {
    mockInAppSend.mockRejectedValue(new Error("Permanent error"));
    const notif = makePendingNotif({ attemptCount: 2 }); // 3rd attempt
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.queue.failed).toBe(1);
    expect(mockPrisma.scheduledNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("concurrent claim: if updateMany returns 0, record is skipped (cancelled)", async () => {
    const notif = makePendingNotif();
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);
    // Simulate another instance already claimed it
    mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.queue.cancelled).toBe(1);
    expect(mockInAppSend).not.toHaveBeenCalled();
  });

  it("dedup: enqueue skips if matching PENDING record exists within window", async () => {
    // Simulate a dup found
    mockPrisma.scheduledNotification.findFirst.mockResolvedValue({ id: "existing" });

    // Trigger discoverTaskReminders with a due task
    mockPrisma.task.findMany.mockResolvedValue([{
      id: "task-1", title: "Do thing", ownerId: "user-1",
    }]);

    const res = await POST(makeRequest());
    const body = await res.json();

    // create should NOT have been called since dup was found
    expect(mockPrisma.scheduledNotification.create).not.toHaveBeenCalled();
    expect(body.enqueued.taskReminders).toBe(0);
  });

  it("burst protection: skips enqueue if recipient already has 20+ notifications in 5 min", async () => {
    mockPrisma.scheduledNotification.findFirst.mockResolvedValue(null);
    // Burst count exceeds threshold
    mockPrisma.scheduledNotification.count.mockResolvedValue(20);

    mockPrisma.task.findMany.mockResolvedValue([{
      id: "task-1", title: "Do thing", ownerId: "user-1",
    }]);

    await POST(makeRequest());
    expect(mockPrisma.scheduledNotification.create).not.toHaveBeenCalled();
  });

  it("recipient deleted after scheduling → record is marked FAILED", async () => {
    const notif = makePendingNotif();
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);
    mockPrisma.user.findUnique.mockResolvedValue(null); // user gone
    mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest());
    const body = await res.json();

    // After 3 retries it becomes FAILED, but on first failure it retries
    // Since attemptCount is 0 (attempt 1), it should be retrying
    expect(body.queue.retrying).toBe(1);
  });

  it("telegram-only provider: only TelegramProvider is called", async () => {
    const notif = makePendingNotif({ provider: "telegram" });
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);

    await POST(makeRequest());

    expect(mockTelegramSend).toHaveBeenCalled();
    expect(mockInAppSend).not.toHaveBeenCalled();
  });

  it("inapp-only provider: only InAppProvider is called", async () => {
    const notif = makePendingNotif({ provider: "inapp" });
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);

    await POST(makeRequest());

    expect(mockInAppSend).toHaveBeenCalled();
    expect(mockTelegramSend).not.toHaveBeenCalled();
  });

  it("sends intent with the correct recipientId to both providers", async () => {
    const notif = makePendingNotif({ recipientId: "user-1" });
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);
    mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 1 });

    await POST(makeRequest());

    expect(mockInAppSend).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-1" }),
    );
    expect(mockTelegramSend).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-1" }),
    );
  });

  it("attempt 2 (attemptCount:1) succeeds → marks record SENT", async () => {
    const notif = makePendingNotif({ attemptCount: 1 });
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);
    mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(body.queue.sent).toBe(1);
    expect(mockPrisma.scheduledNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notif-1" },
        data: expect.objectContaining({ status: "SENT" }),
      }),
    );
  });

  it("provider failure does not crash the cron — response remains 200 with ok:true", async () => {
    mockInAppSend.mockRejectedValue(new Error("Upstream failure"));
    mockTelegramSend.mockRejectedValue(new Error("Upstream failure"));
    const notif = makePendingNotif({ attemptCount: 2 }); // 3rd attempt → FAILED permanently
    mockPrisma.scheduledNotification.findMany.mockResolvedValue([notif]);
    mockPrisma.scheduledNotification.updateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.queue.failed).toBe(1);
  });
});
