// TASK 24.1 — Authentication tests for telegram admin actions
// TASK 24.4 — Authorization tests (scope enforcement)

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (run before module imports) ─────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  telegramLinkToken: { count: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  telegramConnection: { updateMany: vi.fn(), findUnique: vi.fn() },
  telegramConnectionAudit: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const mockRequirePermission = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-guards", () => ({ requirePermissionAction: mockRequirePermission }));

// ── Import after mocks ────────────────────────────────────────────────────────

import {
  generateLinkTokenForUser,
  generateLinkTokenAsManager,
  revokeConnectionAsAdmin,
  getEmployeeTelegramList,
  getEmployeeTelegramListForManager,
} from "../actions";

import { getAnalyticsSummary } from "../analytics/actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_SESSION = { user: { id: "admin-1", role: "ADMIN" } };
const MANAGER_SESSION = { user: { id: "manager-1", role: "MANAGER" } };
const TARGET_USER_ID = "cldabcdef1234567890abcdef";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_USERNAME = "testbot";
  mockPrisma.telegramLinkToken.count.mockResolvedValue(0);
  mockPrisma.telegramLinkToken.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.telegramLinkToken.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID, name: "Alice", role: "EMPLOYEE" });
  mockPrisma.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  mockPrisma.telegramLinkToken.create.mockResolvedValue({});
  mockPrisma.telegramConnectionAudit.create.mockResolvedValue({});
});

// ── TASK 24.1 — Authentication ────────────────────────────────────────────────

describe("24.1 — Authentication", () => {
  it("generateLinkTokenForUser: unauthenticated user is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(generateLinkTokenForUser(TARGET_USER_ID)).rejects.toThrow("Forbidden");
  });

  it("generateLinkTokenAsManager: unauthenticated user is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(generateLinkTokenAsManager(TARGET_USER_ID)).rejects.toThrow("Forbidden");
  });

  it("revokeConnectionAsAdmin: unauthenticated user is rejected", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(revokeConnectionAsAdmin(TARGET_USER_ID)).rejects.toThrow("Forbidden");
  });

  it("generateLinkTokenForUser: authenticated admin succeeds", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    const result = await generateLinkTokenForUser(TARGET_USER_ID);
    expect(result.ok).toBe(true);
  });
});

// ── TASK 24.4 — Authorization ─────────────────────────────────────────────────

describe("24.4 — Authorization", () => {
  beforeEach(() => {
    mockRequirePermission.mockResolvedValue(MANAGER_SESSION);
  });

  it("manager cannot generate link for an ADMIN user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID, name: "Bob", role: "ADMIN" });
    const result = await generateLinkTokenAsManager(TARGET_USER_ID);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/permission/i);
  });

  it("manager cannot generate link for another MANAGER", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID, name: "Carol", role: "MANAGER" });
    const result = await generateLinkTokenAsManager(TARGET_USER_ID);
    expect(result.ok).toBe(false);
  });

  it("manager can generate link for a non-privileged employee", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: TARGET_USER_ID, name: "Dave", role: "EMPLOYEE" });
    const result = await generateLinkTokenAsManager(TARGET_USER_ID);
    expect(result.ok).toBe(true);
  });

  it("generateLinkTokenForUser returns error for unknown user", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await generateLinkTokenForUser(TARGET_USER_ID);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/not found/i);
  });

  it("generateLinkTokenForUser rejects invalid userId format", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    const result = await generateLinkTokenForUser("not-a-cuid");
    expect(result.ok).toBe(false);
  });

  it("revokeConnectionAsAdmin: returns error for unknown user", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await revokeConnectionAsAdmin(TARGET_USER_ID);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/not found/i);
  });

  it("rate limit blocks after 5 requests per hour", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    mockPrisma.telegramLinkToken.count.mockResolvedValue(5);
    const result = await generateLinkTokenForUser(TARGET_USER_ID);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/too many/i);
  });

  it("admin action requires telegram.admin permission", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    await generateLinkTokenForUser(TARGET_USER_ID);
    expect(mockRequirePermission).toHaveBeenCalledWith("telegram.admin");
  });

  it("manager action requires telegram.manage permission", async () => {
    await generateLinkTokenAsManager(TARGET_USER_ID);
    expect(mockRequirePermission).toHaveBeenCalledWith("telegram.manage");
  });
});

// ── 24.4 — Connection list actions ────────────────────────────────────────────

const EMPLOYEE_ROW = {
  id: TARGET_USER_ID,
  name: "Dave",
  email: "dave@example.com",
  role: "EMPLOYEE",
  telegramConnection: null,
};

describe("24.4 — getEmployeeTelegramList (admin)", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(ADMIN_SESSION); });

  it("admin can view all connections", async () => {
    mockPrisma.user.findMany.mockResolvedValue([EMPLOYEE_ROW]);
    const result = await getEmployeeTelegramList();
    expect(result).toHaveLength(1);
    expect(mockPrisma.user.findMany).toHaveBeenCalled();
  });

  it("requires telegram.admin permission", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    await getEmployeeTelegramList();
    expect(mockRequirePermission).toHaveBeenCalledWith("telegram.admin");
  });

  it("employee without telegram.admin is blocked", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(getEmployeeTelegramList()).rejects.toThrow("Forbidden");
  });
});

describe("24.4 — getEmployeeTelegramListForManager", () => {
  beforeEach(() => { mockRequirePermission.mockResolvedValue(MANAGER_SESSION); });

  it("manager list filters out ADMIN and MANAGER roles", async () => {
    mockPrisma.user.findMany.mockResolvedValue([EMPLOYEE_ROW]);
    await getEmployeeTelegramListForManager();
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { notIn: ["ADMIN", "MANAGER"] } }),
      }),
    );
  });

  it("requires telegram.manage permission", async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    await getEmployeeTelegramListForManager();
    expect(mockRequirePermission).toHaveBeenCalledWith("telegram.manage");
  });
});

// ── 24.4 — Analytics API 403 for non-admin ───────────────────────────────────

describe("24.4 — Analytics: 403 for non-admin", () => {
  it("getAnalyticsSummary throws when caller lacks telegram.admin", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(getAnalyticsSummary()).rejects.toThrow("Forbidden");
  });
});

// ── 24.5 — Security ──────────────────────────────────────────────────────────

describe("24.5 — Input validation security", () => {
  it("reason field longer than 500 chars is rejected before any DB write", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    const result = await revokeConnectionAsAdmin(TARGET_USER_ID, "x".repeat(501));
    expect(result.ok).toBe(false);
    expect(mockPrisma.telegramConnection.updateMany).not.toHaveBeenCalled();
  });

  it("userId that is not a valid CUID is rejected before any DB read", async () => {
    mockRequirePermission.mockResolvedValue(ADMIN_SESSION);
    const result = await generateLinkTokenForUser("../../../../etc/passwd");
    expect(result.ok).toBe(false);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("24.5 — Auth-before-DB ordering", () => {
  it("generateLinkTokenForUser: no DB access before auth check", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(generateLinkTokenForUser(TARGET_USER_ID)).rejects.toThrow("Forbidden");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.telegramLinkToken.count).not.toHaveBeenCalled();
  });

  it("generateLinkTokenAsManager: no DB access before auth check", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(generateLinkTokenAsManager(TARGET_USER_ID)).rejects.toThrow("Forbidden");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("revokeConnectionAsAdmin: no DB access before auth check", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(revokeConnectionAsAdmin(TARGET_USER_ID)).rejects.toThrow("Forbidden");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.telegramConnection.updateMany).not.toHaveBeenCalled();
  });
});
