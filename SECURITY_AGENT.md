# Webscale CRM — Security Agent Checklist

> **Purpose:** Run this checklist before marking any LEVEL2.md task complete.
> Every developer and AI agent working on this codebase must pass all applicable items.

---

## How to use

For each LEVEL2.md task, go through every section below. Mark items N/A when genuinely not applicable (e.g., a UI-only component with no server actions). Leave nothing unmarked.

---

## 1. Authentication & Authorization

- [ ] Every server action calls `requirePermissionAction(session, 'capability')` before touching the database.
- [ ] Every server component that renders sensitive data calls `requirePermissionPage(session, 'capability')`.
- [ ] API routes (`/api/...`) validate the session via `auth()` from NextAuth — unauthenticated requests receive 401, not 500.
- [ ] Cron/internal API routes (`/api/cron/...`) are protected by a secret token in the `Authorization: Bearer <CRON_SECRET>` header — not by session.
- [ ] No capability is hidden only on the frontend — the server always enforces the same permission check.
- [ ] Role escalation is impossible: a user cannot perform an action above their role by crafting a direct server action call.

---

## 2. Input Validation

- [ ] Every server action validates all inputs with a Zod schema before using them.
- [ ] Zod schemas reject unexpected extra fields (`.strict()` or explicit `.strip()`).
- [ ] String fields have reasonable max-length limits (titles ≤ 500, descriptions ≤ 5000, notes ≤ 50000).
- [ ] Numeric fields have min/max guards (prices ≥ 0, counts ≥ 0).
- [ ] Date fields validate that the value is a valid date and, where applicable, is in the future.
- [ ] Enum fields reject values outside the declared enum.
- [ ] Optional fields are truly optional — missing values do not crash the action.

---

## 3. Database Safety (Prisma)

- [ ] No raw SQL strings (`prisma.$queryRawUnsafe`, `prisma.$executeRawUnsafe`) unless absolutely unavoidable and parameterized.
- [ ] `where` clauses always include a tenant/ownership scope when records are tenant-specific (e.g., `where: { id, organizationId }`).
- [ ] `select` / `include` is explicit — never returning the entire model when a subset is enough.
- [ ] Sensitive fields (`password`, `telegramChatId`, token columns) are excluded from `select` in listing queries.
- [ ] Cascade deletes are intentional — check the Prisma schema before removing parent records.
- [ ] Bulk operations (updateMany, deleteMany) have non-empty `where` clauses — an empty `where` would affect all rows.

---

## 4. API Route Security

- [ ] Public API routes (e.g., `POST /api/leads/from-landing`) have per-IP rate limiting.
- [ ] Public API routes have per-identifier (email, phone) rate limiting where applicable.
- [ ] Public API routes have a honeypot field check for bot filtering.
- [ ] Webhook routes (`/api/telegram/webhook`) validate the provider's secret header before processing any payload.
- [ ] Request body size is capped (check `content-length` header or use `request.json()` with a size guard).
- [ ] `GET` routes never have side effects (no database writes on GET).
- [ ] `OPTIONS` / CORS headers are only set where intentionally exposing the route to cross-origin requests.

---

## 5. Telegram-Specific Security

- [ ] `TELEGRAM_BOT_TOKEN` is server-only — never referenced in any `"use client"` file or `NEXT_PUBLIC_*` env var.
- [ ] Webhook route validates `X-Telegram-Bot-Api-Secret-Token` header before processing any update.
- [ ] Link tokens are single-use and expire after 15 minutes.
- [ ] Telegram chat IDs are stored only on the employee's own record — no cross-employee access.
- [ ] Notification content respects the recipient's permission scope — do not include data the recipient cannot see in the CRM.
- [ ] A Telegram API failure is caught and logged — it NEVER causes the parent operation (task creation, payment, etc.) to fail.
- [ ] Telegram messages do not include raw database IDs or internal technical identifiers.

---

## 6. Notification Security

- [ ] Notifications are only created for the intended recipient — no broadcast to unrelated users.
- [ ] Notification content is checked against the recipient's role before sending.
- [ ] Unread count queries are scoped to `recipientId = currentUserId` — no cross-user leakage.
- [ ] Marking notifications as read requires the notification's `recipientId` to match the requesting user.
- [ ] The notification delivery log (`/settings/notifications/log`) is Admin-only.

---

## 7. Sensitive Data Handling

- [ ] Passwords are never logged, returned in API responses, or included in audit log diffs.
- [ ] Telegram chat IDs are not exposed in client-side responses or API payloads.
- [ ] Link tokens (Telegram linking, any one-time tokens) are stored hashed if possible, or deleted immediately after use.
- [ ] Analytics events (`LandingPageEvent`) store no PII — no IP addresses, no email, no names.
- [ ] Audit log `oldValue` / `newValue` fields exclude sensitive columns (password, tokens).

---

## 8. Cross-Site Scripting (XSS)

- [ ] User-supplied HTML (rich text editor — Tiptap notes) is sanitized before rendering with `dangerouslySetInnerHTML`.
  - Use a DOMPurify-equivalent sanitizer on the server when reading notes back from the DB for display.
  - Or render via a Tiptap read-only instance (not `dangerouslySetInnerHTML`).
- [ ] Landing page block content (user-edited text) is escaped when rendered in the public `/p/[slug]` route.
- [ ] No user input is inserted into `innerHTML`, `eval()`, or `dangerouslySetInnerHTML` without sanitization.

---

## 9. Cross-Site Request Forgery (CSRF)

- [ ] Server actions in Next.js App Router are protected against CSRF by the framework's built-in origin check — do not disable it.
- [ ] API routes that mutate data validate `Content-Type: application/json` and reject unexpected content types.
- [ ] Cron routes validate their Bearer token — they are not session-based.

---

## 10. Error Handling & Information Leakage

- [ ] Errors returned to the client are human-readable and contain no stack traces, file paths, or SQL error messages.
- [ ] Server actions return `{ ok: false, error: string }` — the error string is user-friendly.
- [ ] Technical details (stack traces, Prisma error codes) are logged server-side only.
- [ ] Authorized admins can access technical details via a "Details" disclosure in the UI — not as the primary error message.
- [ ] 404 responses do not reveal whether a record exists (e.g., `/leads/[id]` returns the same 404 for a non-existent lead and a lead belonging to another tenant).

---

## 11. Audit & Observability

- [ ] Security-relevant actions are written to the `AuditLog` (once D4 is built): role changes, price changes, publish/unpublish, Telegram connect/disconnect.
- [ ] IP address is recorded in the audit log for auth-related events.
- [ ] Failed authentication attempts (invalid session, expired token, invalid cron secret) are logged server-side.

---

## 12. Dependency & Code Safety

- [ ] No new npm packages introduced without a clear justification in the PR description.
- [ ] Any new package has been checked for known CVEs (`npm audit`).
- [ ] No `dangerouslyDisableSandbox`, `--no-verify` git flags, or security-bypassing workarounds introduced.
- [ ] Environment variables follow the convention: `NEXT_PUBLIC_*` only for values safe to expose to the browser.

---

## Quick reference — common Webscale patterns

### Server action guard (required on every action)
```ts
const session = await requireSession(); // throws if not logged in
requirePermissionAction(session, 'leads.write'); // throws if no permission
```

### Zod schema (required on every action)
```ts
const parsed = mySchema.safeParse(input);
if (!parsed.success) return { ok: false, error: 'Invalid input.' };
```

### Rate limit (required on every public API route)
```ts
const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
// check ipBuckets Map — return 429 if exceeded
```

### Telegram fire-and-forget (required pattern)
```ts
try {
  await NotificationService.send({ recipientId, type, payload });
} catch {
  // log, never rethrow
}
```

---

*This document is a living checklist. Update it when new security patterns are introduced.*
*Last reviewed: 2026-08-14*
