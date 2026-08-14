# Webscale CRM — Level 2 Product Evolution

> **READ BEFORE ANY WORK:** Read `DESIGN.md` in full before touching any file.
> All new work must extend the existing design system — no parallel design languages.
> Run `SECURITY_AGENT.md` checklist before marking any task complete.

---

## Phase A — Productivity Foundation

### A1 · Task Engine
**Status:** [x] Done (shipped 2026-08-14)

**Before starting:** Read `DESIGN.md` §3, §27, §29, §30, §35.

Build a centralized Task Engine. Tasks are the primary tool for accountability and follow-up inside the CRM.

**Data model fields:**
- `id`, `title`, `description`
- `ownerId` → Employee
- `priority`: Low | Normal | High | Urgent
- `status`: Todo | InProgress | Completed | Cancelled
- `dueDate`
- `entityType`: Lead | Student | Customer | Course | Session | Payment | Campaign | LandingPage
- `entityId`
- `source`: manual | system | automation
- `createdAt`, `updatedAt`, `completedAt`

**Required UI:**
- `/tasks` list page — filterable by status, priority, due date, owner, entity type
- Task detail drawer (DrawerForm primitive)
- Due-date views: today / overdue / upcoming / no-date
- Priority indicators (Urgent → red, High → amber, Normal → default, Low → muted)
- Completion toggle (checkmark, optimistic update)
- Quick creation from command menu + `c` shortcut
- Empty states for each filter state

**Integration:**
- Link task to lead/student/course/etc. — clicking entity opens entity page
- Tasks appear in entity workspaces (Leads `/leads/[id]`, Students `/students/[id]`, etc.)

**Quality gates:**
- [ ] Loading skeleton
- [ ] Empty state explains why + what to do
- [ ] Overdue tasks visually distinct (red due date)
- [ ] Keyboard navigable
- [ ] RTL/Arabic works
- [ ] Permission-scoped (only see tasks assigned to you unless Admin/Manager)
- [ ] SECURITY_AGENT.md checklist passed

---

### A2 · Next Action System
**Status:** [x] Done (shipped 2026-08-14)

**Before starting:** Read `DESIGN.md` §3, §8, §27, §35.

Every important CRM record must answer: **what should happen next?**

**Fields on Lead (extend existing model):**
- `nextAction` (text) — what to do
- `nextActionDue` (datetime) — when
- `nextActionOwnerId` → Employee

**Required UI:**
- Inline "Next action" section on lead workspace Overview tab
- Editable inline (click to edit — no full-page navigation)
- "Mark done + schedule follow-up" CTA creates a new next action
- Overdue next actions visually flagged in the leads list (amber/red indicator)
- Filter in leads table: "Needs follow-up", "Overdue", "Due today"

**Quality gates:**
- [ ] Next action visible without scrolling on lead workspace
- [ ] Overdue state distinct from future state
- [ ] Completing an action prompts to schedule the follow-up
- [ ] RTL/Arabic works
- [ ] SECURITY_AGENT.md checklist passed

---

### A3 · Follow-up Management for Leads
**Status:** [x] Done (shipped 2026-08-14)

**Before starting:** Read `DESIGN.md` §8, §18, §27, §35.

Lead management must be action-oriented. No lead should be silently forgotten.

**Leads list enhancements:**
- New filter presets: My Leads | Needs Follow-up | Overdue | Due Today | High Priority | Unassigned
- Column: Last Contact (from `lastContactedAt`)
- Column: Next Action Due
- Visual indicator: overdue = red, due today = amber

**Lead workspace Overview tab:**
- Show prominently: owner, last contact, next action, next action due
- "Log activity" shortcut (opens communication sheet)
- "Schedule follow-up" shortcut (opens next-action editor)

**Quality gates:**
- [ ] Filter presets persist in URL (nuqs)
- [ ] Overdue leads visible without extra steps
- [ ] Empty filter state explains what it means + suggests action
- [ ] SECURITY_AGENT.md checklist passed

---

### A4 · Activity Timeline Upgrade
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §9, §30, §35.

The existing `ActivityTimeline` must become a unified history system, not a decorative component.

**Event types to record:**
- Communication logged (call, WhatsApp, email, meeting, note)
- Status changed (e.g. Interested → Registered)
- Next action set / completed
- Task created / completed
- Registration created
- Payment recorded / status changed
- Attendance marked
- Landing page event (published, unpublished)
- Ownership changed
- Record created / edited

**Implementation:**
- New `ActivityEvent` Prisma model: `id`, `entityType`, `entityId`, `actorId`, `type`, `metadata` (JSON), `createdAt`
- `recordActivity` server action — fire-and-forget, never throws
- Display: chronological, grouped by day, actor name + avatar initial, icon per type, metadata preview

**Quality gates:**
- [ ] Timeline renders for leads, students, courses
- [ ] Grouped by date ("Today", "Yesterday", "Aug 12")
- [ ] Each event has meaningful icon + readable description
- [ ] Arabic text renders correctly RTL
- [ ] SECURITY_AGENT.md checklist passed

---

### A5 · Global Quick Create (polish existing)
**Status:** [ ] Done (c shortcut + QuickCreateMenu shipped 2026-08-14)

The `c` shortcut and `QuickCreateMenu` are already implemented. Verify:
- [ ] All create commands in registry use correct permissions
- [ ] Task creation added to registry once Task Engine (A1) is built
- [ ] SECURITY_AGENT.md checklist passed

---

### A6 · Command Menu Upgrade
**Status:** [ ] Partially done (shipped 2026-08-12, needs Task search)

**Before starting:** Read `DESIGN.md` §31, §32, §35.

**Add after A1 is shipped:**
- `search.tasks` — debounced search across task titles
- `create.task` — opens task create drawer
- `goto.tasks` — navigates to /tasks

Everything else (debounced entity search, recents, permission-aware filtering) already works.

**Quality gates:**
- [ ] Task commands respect `tasks.view` / `tasks.write` permissions
- [ ] SECURITY_AGENT.md checklist passed

---

### A7 · Global Search Upgrade
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §31, §35.

The existing command menu has entity search. This task makes it work across more entity types and returns richer results.

**Search scope:**
- Leads (name, phone, email)
- Students (name, phone, email)
- Courses (name, slug)
- Tasks (title)
- Landing Pages (title, slug)
- Campaigns (name)
- Payments (reference number, student name)

**Result card shows:** entity type badge + name + key metadata (status, phone, etc.)

**Quality gates:**
- [ ] Results clearly identify entity type
- [ ] Empty result state helpful ("No results for '…'")
- [ ] Navigates directly to entity on selection
- [ ] Results respect user's permission scope
- [ ] SECURITY_AGENT.md checklist passed

---

### A8 · Details Drawer
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §19, §30, §35.

Allow quick inspection of a record from within a table without losing context.

**Priority entity:** Lead (the highest-volume table).

**Lead details drawer:**
- Opens from leads table row — "Quick view" action in row menu
- Shows: name, status badge, phone, email, course interest, owner, next action, last contact
- Actions: Create Task, Log Communication, Open Full Profile, Edit

**Later extend to:** Students, Courses.

**Quality gates:**
- [ ] Drawer closes on Escape and backdrop click
- [ ] Full profile link always visible
- [ ] RTL layout works
- [ ] SECURITY_AGENT.md checklist passed

---

## Phase B — Daily Workspace

### B1 · Workday Dashboard
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §7, §3, §27, §28, §35 in full before touching the dashboard.

Replace the current KPI-first dashboard with an action-first workday workspace.

**Layout (top to bottom):**

1. **Greeting + summary**
   ```
   Good morning, Ahmed.
   You have 5 things that need your attention today.
   ```
   Adapt greeting to time of day (morning / afternoon / evening).

2. **Attention center** — actionable items requiring immediate response
   ```
   3 leads need follow-up       [View leads →]
   2 payments need confirmation  [View payments →]
   4 tasks are overdue           [View tasks →]
   ```
   Each row is a button linking to the relevant filtered view.

3. **Today's schedule** — sessions happening today
   ```
   AI Engineering · 09:00 – 13:00 · 28 students
   Digital Marketing · 14:00 – 17:00 · 15 students
   ```

4. **Priority tasks** — top 5 tasks due today / overdue
   ```
   Follow up with Sara          Due today · 16:00  [Mark done]
   Confirm Ahmed's payment      Overdue · Aug 12   [Mark done]
   ```

5. **Business overview** — existing KPI cards + charts (moved below operational content)

**Quality gates:**
- [ ] Greeting reflects actual user name from session
- [ ] Attention center items are real data (no fake placeholders)
- [ ] Empty attention center shows positive message ("Everything looks good.")
- [ ] Role-aware: Sales sees leads, Finance sees payments, Trainer sees sessions
- [ ] Loading skeleton covers all sections
- [ ] SECURITY_AGENT.md checklist passed

---

### B2 · Role-Aware Workspace
**Status:** [ ] Partially done (permissions shipped; dashboard not yet role-aware)

**Before starting:** Read `DESIGN.md` §34, §35.

The dashboard attention center and priority tasks must be filtered by role:

| Role | Attention center focus |
|------|------------------------|
| Sales | Leads, follow-ups, pipeline |
| Marketing | Campaigns, landing pages, leads |
| Trainer | Sessions today, attendance pending |
| Finance | Pending payments, overdue payments |
| Manager | Everything — team performance view |
| Admin | Everything — system health |

Implementation: server component receives `session.user.role`, calls role-specific queries, passes typed props to client components.

**Quality gates:**
- [ ] Each role sees relevant data on first load
- [ ] No data leaks across roles
- [ ] SECURITY_AGENT.md checklist passed

---

### B3 · Notification Center
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §21, §30, §35.

Create a persistent in-app notification system.

**Data model:**
- `Notification`: `id`, `recipientId`, `type`, `category` (ActionRequired | Info | Success | System), `title`, `body`, `entityType`, `entityId`, `read`, `readAt`, `createdAt`, `priority`

**UI:**
- Bell icon in topbar with unread count badge (max "9+")
- Notification panel (popover/sheet): grouped by date, read/unread state, category icon
- "Mark all read" action
- Click notification → navigate to related entity
- Notification preferences page (B3a — comes with B5 Telegram)

**Notification triggers (initial set):**
- Task assigned to you
- Task overdue (> due date)
- Lead assigned to you
- Payment needs confirmation (status = Pending)
- Course at 90% capacity

**Quality gates:**
- [ ] Unread count updates without full page reload (polling or real-time)
- [ ] Notification panel accessible via keyboard
- [ ] "Mark all read" works optimistically
- [ ] Notifications respect permission scope
- [ ] Do NOT send duplicate notifications for the same event
- [ ] SECURITY_AGENT.md checklist passed

---

### B4 · Course Operations Center
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §10, §21, §35.

Upgrade the course detail page (`/courses/[slug]`) into an operational workspace.

**Header upgrade:**
```
AI Engineering — August 2026
Open  ·  32 / 40 seats  ·  Next: Tomorrow 09:00

[Attendance]  [Students]  [Send Reminder]  [Landing Page]  [···]
```

**Tabs:**
- Overview (existing)
- Registrations (existing — upgrade with capacity bar)
- Sessions (existing — upgrade with "Take attendance" in row)
- Payments (existing)
- Landing Pages (existing)
- Campaigns (new — campaigns linked to this course)
- Activity (new — activity timeline for the course)

**Capacity bar:** visual fill (green → amber at 75% → red at 90%+).

**Quality gates:**
- [ ] Capacity bar reflects real registration count
- [ ] Header KPIs update without full reload after registration
- [ ] Empty Activity tab has meaningful empty state
- [ ] RTL layout works
- [ ] SECURITY_AGENT.md checklist passed

---

### B5 · Student 360 Workspace
**Status:** [ ] Partially done (workspace exists; upgrade per spec)

**Before starting:** Read `DESIGN.md` §9, §35.

Upgrade `/students/[id]` to answer immediately:
- Which courses did they attend?
- What did they pay / what is pending?
- What is their attendance rate?
- What conversations occurred?
- What should happen next?

**Enhancements:**
- Overview tab: show aggregate stats (total paid, courses enrolled, attendance %)
- Add "Next action" section to Overview (same as A2 for leads — extend model to Student)
- Registrations tab: show per-registration attendance summary
- Activity tab: use upgraded ActivityTimeline (A4)

**Quality gates:**
- [ ] Overview answers all 5 questions above without scrolling (or with minimal scroll)
- [ ] SECURITY_AGENT.md checklist passed

---

### B6 · Attendance Workflow
**Status:** [ ] Partially done (TakeAttendanceDialog shipped 2026-08-13; first-class UX upgrade needed)

**Before starting:** Read `DESIGN.md` §23, §35.

Make attendance a first-class daily operational feature.

**Upgrade `/attendance` route:**
- "Today's sessions" section always at top — zero clicks to reach attendance
- One-click "Take attendance" button per session (opens existing TakeAttendanceDialog)
- After submission: show attendance summary card (present X / absent Y / late Z)
- Attendance rate % per student shown in student workspace Registrations tab

**Future-ready but NOT required now:** QR check-in architecture. Leave a `checkInMethod: manual | qr` column in the schema but don't build the QR UI.

**Quality gates:**
- [ ] Today's sessions visible without filtering
- [ ] Attendance summary visible after marking
- [ ] RTL works
- [ ] SECURITY_AGENT.md checklist passed

---

## Phase C — Telegram Integration

### C1 · Notification Abstraction Layer
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §1, §35. Read `AGENTS.md`.

Create a provider-agnostic notification engine before writing any Telegram code.

**Architecture:**
```
NotificationService
  .send(intent: NotificationIntent) → void (fire-and-forget)

NotificationIntent {
  recipientId: string        // Employee ID
  type: NotificationType
  payload: Record<string, unknown>
  entityType?: string
  entityId?: string
  scheduledAt?: Date
}

Providers registered at startup:
  - InAppProvider   → writes Notification row to DB
  - TelegramProvider → sends via Bot API (only if employee has linked Telegram + has that type enabled)
```

**File:** `src/lib/notifications/notification-service.ts`

**Quality gates:**
- [ ] Business modules call `NotificationService.send()` — they NEVER import Telegram directly
- [ ] A Telegram failure NEVER causes the calling operation to fail
- [ ] Providers are registered via a simple array — adding a new provider requires 0 changes to business logic
- [ ] SECURITY_AGENT.md checklist passed

---

### C2 · Telegram Bot Integration
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §35. Read `AGENTS.md` for Next.js API routes.

Set up the Telegram Bot API integration.

**Dependencies:** `node-telegram-bot-api` or raw `fetch` to `api.telegram.org`. Prefer raw fetch to avoid extra dependencies.

**Config (env vars):**
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

**Files:**
- `src/lib/telegram/client.ts` — `sendMessage(chatId, text, options?)` using HTML parse mode
- `src/app/api/telegram/webhook/route.ts` — receives updates from Telegram (POST), validates `X-Telegram-Bot-Api-Secret-Token` header, routes `/start` + `/link <token>` commands to the linking handler
- `src/lib/telegram/message-templates.ts` — all message text in one place (supports Arabic and English)

**Quality gates:**
- [ ] Bot token never exposed to client
- [ ] Webhook validates secret header before processing any update
- [ ] All Telegram API calls are wrapped in try/catch — failure is logged, not thrown
- [ ] SECURITY_AGENT.md checklist passed

---

### C3 · Employee Telegram Connection Flow
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §34, §35.

Employees connect their Telegram account without entering raw chat IDs.

**Flow:**
```
Settings → Notifications → Telegram → Connect Telegram
→ System generates one-time link token (6 chars, 15-min TTL)
→ Employee opens bot and sends /link <token>
→ Bot stores chatId against Employee record
→ CRM polls or webhook confirms → shows "Connected ✓"
```

**Schema additions:**
- `Employee.telegramChatId` (String?, unique)
- `TelegramLinkToken`: `id`, `employeeId`, `token`, `expiresAt`, `usedAt`

**UI:**
- `/settings/notifications` page — "Telegram" section with Connect button
- Shows connection status: Connected (username) | Not connected
- "Disconnect" action clears `telegramChatId`

**Quality gates:**
- [ ] Token expires after 15 minutes — old tokens rejected
- [ ] Token is single-use — cannot be reused after linking
- [ ] Disconnect clears chatId and all preference rows
- [ ] Employee cannot link another employee's account (token is scoped to the requesting user's session)
- [ ] SECURITY_AGENT.md checklist passed

---

### C4 · Notification Preferences
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §35.

Each employee controls which Telegram notifications they receive.

**Schema:** `NotificationPreference`: `employeeId`, `type` (NotificationType enum), `channel` (telegram | inapp), `enabled` (Boolean), unique on (employeeId, type, channel).

**UI (on `/settings/notifications`):**
```
Telegram Notifications

Tasks
✓ Task reminders (30 min before due)
✓ Overdue task alert (daily at 09:00)

Courses
✓ Session reminders (1 hour before)
○ Course updates

Payments
✓ Payment pending alert

Leads
✓ New lead assigned to me

System
○ Daily digest
```

Sensible defaults: task reminders ON, overdue ON, session reminders ON, payment alert ON, new lead ON, daily digest OFF.

**Quality gates:**
- [ ] Preferences saved per-employee, not globally
- [ ] Default preferences created on first settings page visit
- [ ] `NotificationService` checks preferences before calling TelegramProvider
- [ ] SECURITY_AGENT.md checklist passed

---

### C5 · Telegram Notification Types
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §35.

Implement the high-value notification types via `TelegramProvider`.

**C5a — Task reminder** (30 min before dueDate):
```
🔔 Reminder

Your task is due in 30 minutes.
Follow up with Sara
```

**C5b — Overdue task** (daily at 09:00 if overdue tasks exist):
```
⚠️ Overdue Tasks

You have 3 overdue tasks.
[Open CRM]
```

**C5c — Session reminder** (1 hour before session start):
```
📚 Session Reminder

AI Engineering Course
Tomorrow · 09:00 – 13:00
Webscale Training Center
28 registered students
```

**C5d — Payment pending alert** (when payment status stays Pending > 24h):
```
💳 Payment Reminder

Ahmed's payment is still pending.
Amount: 18,000 DA
[View in CRM]
```

**C5e — New lead assigned**:
```
👤 New Lead

Sara Benali has been assigned to you.
Digital Marketing Course
[Open Lead]
```

**C5f — Daily digest** (opt-in, sent at 08:00 to Admin/Manager):
```
📊 Today's Summary — Aug 14

New Leads: 12
Registrations: 8
Revenue: 84,000 DA
Pending Payments: 6
Upcoming Sessions: 2
Overdue Tasks: 3
```

**Implementation:**
- Scheduled notifications: store in `ScheduledNotification` table, processed by cron-like API route (`/api/cron/notifications`) called by Vercel Cron / external cron
- Inline notifications (new lead, payment): fire immediately via `NotificationService.send()` inside the relevant server action, wrapped in try/catch

**Quality gates:**
- [ ] Each message type tested in dev with a test Telegram account
- [ ] Long Arabic names do not break message formatting
- [ ] Deep links in messages use `NEXT_PUBLIC_APP_URL`
- [ ] Daily digest only sends if recipient has opted in
- [ ] SECURITY_AGENT.md checklist passed

---

### C6 · Notification Scheduling Engine
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §35. Read `AGENTS.md`.

**Schema:** `ScheduledNotification`:
- `id`, `type`, `recipientId`, `payload` (JSON), `scheduledAt`, `status` (pending | processing | sent | failed | cancelled)
- `attemptCount`, `lastAttemptAt`, `failureReason`, `sentAt`, `provider`
- `entityType`, `entityId`

**Cron route:** `POST /api/cron/notifications` — protected by `Authorization: Bearer <CRON_SECRET>` header.
```
1. Find notifications WHERE status=pending AND scheduledAt <= now LIMIT 50
2. Mark each as processing
3. For each: validate recipient exists, check preference enabled
4. Call provider (InApp or Telegram)
5. On success: status=sent, sentAt=now
6. On failure: status=failed if attemptCount >= 3, else status=pending with scheduledAt += exponential backoff
```

**Quality gates:**
- [ ] Cron route rejects requests without valid Bearer token
- [ ] Max 3 retry attempts with backoff (30s, 5m, 30m)
- [ ] A single failed notification NEVER blocks others in the batch
- [ ] `processing` state is cleaned up if cron crashes (reset to `pending` after 5 min)
- [ ] SECURITY_AGENT.md checklist passed

---

### C7 · Notification Delivery Audit Trail
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §35.

Every Telegram notification must be traceable by admins.

**UI:** `/settings/notifications/log` (Admin only)
- Table: Type | Recipient | Channel | Scheduled | Sent | Status | Entity
- Row expand: shows payload preview, failure reason (if any), attempt count
- Filter by: status, recipient, date range

**Quality gates:**
- [ ] Admins can see all delivery records
- [ ] Non-admins cannot access the log
- [ ] Failure reasons are human-readable (no raw API errors shown)
- [ ] Technical details available via "Details" disclosure (not as primary message)
- [ ] SECURITY_AGENT.md checklist passed

---

## Phase D — Operational Intelligence

### D1 · Course Capacity Alerts
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §10, §22, §35.

Trigger in-app + Telegram notifications when course capacity thresholds are crossed.

**Thresholds:** 75% | 90% | 100%

**Trigger:** inside `createRegistration` server action — after inserting, compute fill %, check if a new threshold was just crossed, fire `NotificationService.send()`.

**Notifications go to:** course owner / Admin / Manager (based on preference).

**UI:** Capacity bar on course header + course list card (green → amber → red).

**Quality gates:**
- [ ] Notification fires once per threshold crossing (not on every registration above 90%)
- [ ] 100% triggers FULL status + blocks new registrations with human-readable error
- [ ] SECURITY_AGENT.md checklist passed

---

### D2 · Landing Page Analytics
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §12, §24, §35.

Instrument real metrics for landing pages. Only display what is actually tracked.

**Track (via `/api/track` POST route):**
- Page view: `{ slug, referrer, userAgent }` — server-side, no client JS needed (use Next.js middleware or route handler reading request headers)
- CTA click: `{ slug, blockId }` — client-side fire-and-forget fetch

**Store:** `LandingPageEvent`: `id`, `pageId`, `type` (view | cta_click | form_submit), `sessionId` (anonymous), `referrer`, `country`, `createdAt`.

**Analytics panel** (on landing page detail or edit page):
- Views (unique + total)
- CTA clicks
- Form submissions (already tracked via lead creation)
- Conversion rate = submissions / views

**Quality gates:**
- [ ] No PII stored in analytics events (no IP, no email)
- [ ] Views deduped per session (1 view per anonymous session per day)
- [ ] Analytics panel shows "No data yet" empty state — not fake 0s
- [ ] `/api/track` cannot be used to spam the DB (rate-limit by IP + session)
- [ ] SECURITY_AGENT.md checklist passed

---

### D3 · Campaign Attribution
**Status:** [ ] Partially done (UTM fields + attribution tab exist; this upgrades accuracy)

**Before starting:** Read `DESIGN.md` §25, §35.

Strengthen the attribution chain:
```
Campaign → Landing Page → Lead → Registration → Payment → Revenue
```

**Upgrade:** When a lead is created via landing page form, auto-associate the `campaignId` if the page belongs to a campaign (via `LandingPage.campaignId`).

**Campaign workspace upgrade:**
- Attribution tab: show the funnel with real drop-off %
- Revenue column in campaigns list

**Quality gates:**
- [ ] Attribution chain is queryable end-to-end
- [ ] No double-counting (one lead → one campaign)
- [ ] SECURITY_AGENT.md checklist passed

---

### D4 · Audit Log
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §30, §34, §35.

Track important changes across the system.

**Schema:** `AuditLog`: `id`, `actorId`, `action`, `entityType`, `entityId`, `oldValue` (JSON?), `newValue` (JSON?), `createdAt`, `ip`.

**Events to log:**
- Price changed on course
- Lead status changed
- Registration created / cancelled
- Payment status changed
- Employee role changed
- Telegram connected / disconnected
- Landing page published / unpublished

**UI:** `/settings/audit-log` (Admin only) — filterable table.

**Quality gates:**
- [ ] Sensitive field changes (price, role, payment) always logged
- [ ] Old + new values stored for diffable fields
- [ ] Admins only — 403 for all other roles
- [ ] IP stored for security-relevant events (role changes, auth)
- [ ] SECURITY_AGENT.md checklist passed

---

### D5 · Landing Page Version History
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §12, §15, §35.

**Schema:** `LandingPageVersion`: `id`, `pageId`, `content` (JSON — the full `LandingBlock[]`), `createdAt`, `createdById`.

**Save trigger:** every publish event + every manual "Save snapshot" action (not every autosave — that would create too many versions).

**UI (in landing page editor sidebar):**
```
Version history
v7  — 2 min ago  [Preview] [Restore]
v6  — 18 min ago [Preview] [Restore]
v5  — Yesterday  [Preview] [Restore]
```

Preview opens in a new tab using a signed preview URL.
Restore replaces current draft content (does not auto-publish).

**Quality gates:**
- [ ] Max 50 versions stored per page (prune oldest on insert)
- [ ] Restore requires confirmation dialog
- [ ] Restoring does NOT auto-publish
- [ ] SECURITY_AGENT.md checklist passed

---

### D6 · Landing Page Autosave Reliability
**Status:** [ ] Partially done (1000ms debounce autosave exists; status indicator needs upgrade)

**Before starting:** Read `DESIGN.md` §15, §27, §35.

Make the save state explicit and reliable.

**States to show in editor header:**
- `Saving…` (debounce in progress)
- `Saved just now`
- `Unsaved changes` (debounce pending after offline/error)
- `Failed to save — [Retry]`

**Quality gates:**
- [ ] User never loses work silently
- [ ] Network failure shows "Failed to save" with retry button
- [ ] Retry uses the latest editor state (not stale closure)
- [ ] SECURITY_AGENT.md checklist passed

---

### D7 · Draft / Preview / Publish Hardening
**Status:** [ ] Partially done (publish/unpublish exist; draft-vs-published split not enforced)

**Before starting:** Read `DESIGN.md` §12, §15, §28, §35.

Editing a draft must NEVER modify the live published page automatically.

**Schema change:** Add `publishedContent` (JSON?) to `LandingPage` — separate from `content` (draft).
- `content` = working draft (what the editor modifies)
- `publishedContent` = the snapshot served at `/p/[slug]`
- Publishing = `publishedContent = content`
- Unpublishing = `status = draft` (publishedContent kept for re-publish)

**Public route `/p/[slug]`:** renders `publishedContent`, not `content`.

**Quality gates:**
- [ ] Editing draft while published does not change the live public page
- [ ] Publish button clearly shows what will go live (last saved draft)
- [ ] Unpublish shows confirmation (public page will go down)
- [ ] SECURITY_AGENT.md checklist passed

---

## Phase E — Future Automation Foundation

### E1 · Event-Driven Notification Triggers
**Status:** [ ] Todo

**Before starting:** Read `DESIGN.md` §35.

Standardize how business events trigger notifications, so adding new triggers requires minimal code changes.

**Pattern:**
```ts
// Inside any server action:
await eventBus.emit('lead.assigned', { leadId, assigneeId, assignedById })

// EventBus routes to:
//   → ActivityEvent recorder (A4)
//   → NotificationService (B3 / C1)
//   → AuditLog (D4)
```

**Implementation:** Simple in-process event bus (`src/lib/events/event-bus.ts`) — synchronous, NOT a message queue (keep it simple for now). Async external queue is a future concern.

**Quality gates:**
- [ ] Business logic (server actions) does not import Telegram, ActivityRecorder, or AuditLog directly
- [ ] Adding a new event type requires: 1 type definition + 1 handler registration
- [ ] SECURITY_AGENT.md checklist passed

---

## Cross-Cutting Requirements (all tasks)

> These apply to EVERY task above. Check each before marking done.

### Design consistency
- Use `PageHeader`, `SectionHeader`, `StatCard`, `StatusBadge`, `EmptyState`, `ConfirmDialog`, `DataTable`, `FilterBar`, `SearchInput`, `FormSection`, `ActivityTimeline`, `EntityCard`, `DrawerForm`, `CommandMenu` from the existing design system.
- No new design languages. No ad-hoc styling inconsistent with the current system.

### RTL / Arabic
- All new UI must work in RTL. Use logical CSS utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`).
- Telegram messages must not break on Arabic text.

### Permissions
- Respect `src/lib/permissions.ts`. Every server action must call `requirePermissionAction`. Every server component must call `requirePermissionPage`.

### Performance
- Server Components by default. Client Components only when interactivity requires it.
- Dynamic import for heavy modules (rich editor, charts, page builder).

### Error handling
- All errors must be human-readable and recoverable. Never expose raw HTTP/database errors to employees.

### Accessibility
- Keyboard navigable. Correct ARIA labels. Sufficient contrast (WCAG AA).

---

## Completion Status Summary

| Phase | Tasks | Done |
|-------|-------|------|
| A — Productivity Foundation | A1–A8 | A5 (partial), A6 (partial) |
| B — Daily Workspace | B1–B6 | B2 (partial), B5 (partial), B6 (partial) |
| C — Telegram | C1–C7 | — |
| D — Operational Intelligence | D1–D7 | D3 (partial), D6 (partial), D7 (partial) |
| E — Automation Foundation | E1 | — |

---

*Last updated: 2026-08-14 · Read `DESIGN.md` and `SECURITY_AGENT.md` before any implementation.*
