// TASK 24.2 — Linking token lifecycle tests

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSendMessage = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true, errorCode: null }));
vi.mock("@/lib/telegram/client", () => ({ sendMessage: mockSendMessage }));

const mockPrisma = vi.hoisted(() => ({
  telegramLinkToken: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  telegramConnection: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  telegramConnectionAudit: { create: vi.fn() },
  notificationPreference: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// Import handler after mocks
import { POST } from "../webhook/route";

// ── Env setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
  process.env.TELEGRAM_BOT_USERNAME = "testbot";

  // Default: no pre-existing connection
  mockPrisma.telegramConnection.findUnique.mockResolvedValue(null);
  mockPrisma.telegramConnection.findFirst.mockResolvedValue(null);
  mockPrisma.telegramConnectionAudit.create.mockResolvedValue({});
  mockPrisma.telegramLinkToken.update.mockResolvedValue({});
  mockPrisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 }); // token claim succeeds by default
  mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

function makeRequest(body: unknown, secret = "test-secret") {
  return new NextRequest("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body: JSON.stringify(body),
  });
}

function makeUpdate(text: string, chatId = 123, userId = 456) {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      chat: { id: chatId },
      from: { id: userId, first_name: "Test", language_code: "en" },
      text,
    },
  };
}

const VALID_TOKEN_RECORD = {
  token: "ABC123",
  employeeId: "emp-001",
  usedAt: null,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
};

// ── 24.5 — Webhook body / DoS hardening ──────────────────────────────────────

describe("24.5 — Webhook security hardening", () => {
  it("oversized body (>64 KB) is silently dropped — 200, sendMessage not called", async () => {
    const req = new NextRequest("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
        "content-length": String(65 * 1024),
      },
      body: JSON.stringify(makeUpdate("/help")),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("malformed JSON body → 200, no processing", async () => {
    const req = new NextRequest("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "test-secret",
      },
      body: "{ this is : not : valid json }",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("update with no message.text is silently ignored", async () => {
    const req = makeRequest({ update_id: 1, message: { message_id: 1, chat: { id: 123 } } });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("Webhook security", () => {
  it("returns 200 (not 401) for wrong secret to avoid retry storms", async () => {
    const res = await POST(makeRequest(makeUpdate("/help"), "wrong-secret"));
    expect(res.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("returns 200 for missing secret", async () => {
    const req = new NextRequest("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(makeUpdate("/help")),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});

// ── TASK 24.2 — Token lifecycle ───────────────────────────────────────────────

describe("24.2 — Linking token lifecycle", () => {
  it("valid token → upserts connection to CONNECTED and sends success message", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(VALID_TOKEN_RECORD);
    mockPrisma.telegramConnection.upsert.mockResolvedValue({ status: "CONNECTED" });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("linked successfully"),
    );
  });

  it("expired token → sends expired message, no connection created", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue({
      ...VALID_TOKEN_RECORD,
      expiresAt: new Date(Date.now() - 1000), // expired
    });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("expired"),
    );
  });

  it("already-used token → sends used message, no connection created", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue({
      ...VALID_TOKEN_RECORD,
      usedAt: new Date(),
    });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("already been used"),
    );
  });

  it("unknown token → sends invalid message", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest(makeUpdate("/link BADTOK")));
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("Invalid"),
    );
  });

  it("chatId already linked to a different employee → sends already-connected message", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(VALID_TOKEN_RECORD);
    // Guard check uses findFirst (query by telegramChatId), not findUnique
    mockPrisma.telegramConnection.findFirst.mockResolvedValue({ userId: "other-emp" });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("already connected"),
    );
  });

  it("/start with token behaves identically to /link", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(VALID_TOKEN_RECORD);
    mockPrisma.telegramConnection.upsert.mockResolvedValue({ status: "CONNECTED" });

    const res = await POST(makeRequest(makeUpdate("/start ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("/help command returns help message without touching DB", async () => {
    const res = await POST(makeRequest(makeUpdate("/help")));
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("Commands"),
    );
    expect(mockPrisma.telegramLinkToken.findUnique).not.toHaveBeenCalled();
  });

  it("/status returns not-connected message for unknown chatId", async () => {
    const res = await POST(makeRequest(makeUpdate("/status")));
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("Not connected"),
    );
  });

  it("concurrent claim: second request gets updateMany count:0 → msgLinkUsed, no $transaction", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(VALID_TOKEN_RECORD);
    // Simulate race: another instance already claimed the token
    mockPrisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(123, expect.stringContaining("already been used"));
  });

  it("valid token → reconnects a DISABLED connection back to CONNECTED", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(VALID_TOKEN_RECORD);
    // findUnique returns the previous connection state (DISABLED)
    mockPrisma.telegramConnection.findUnique.mockResolvedValue({ status: "DISABLED" });
    mockPrisma.telegramConnection.upsert.mockResolvedValue({ status: "CONNECTED" });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.telegramConnectionAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "re_linked" }) }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith(123, expect.stringContaining("linked successfully"));
  });

  it("valid token → reconnects a REVOKED connection back to CONNECTED", async () => {
    mockPrisma.telegramLinkToken.findUnique.mockResolvedValue(VALID_TOKEN_RECORD);
    mockPrisma.telegramConnection.findUnique.mockResolvedValue({ status: "REVOKED" });
    mockPrisma.telegramConnection.upsert.mockResolvedValue({ status: "CONNECTED" });

    const res = await POST(makeRequest(makeUpdate("/link ABC123")));
    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.telegramConnectionAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "re_linked" }) }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith(123, expect.stringContaining("linked successfully"));
  });
});
