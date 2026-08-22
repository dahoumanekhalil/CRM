# Sales Commission & Payout System — Architecture Analysis

> **Stage 1 — Read / Inspect / Analyze / Plan Only**
> No source files were modified during this analysis.
> Date: 2026-08-21

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture](#2-current-architecture)
3. [Current Data Model](#3-current-data-model)
4. [Current Sales Workflow](#4-current-sales-workflow)
5. [Current Payment Workflow](#5-current-payment-workflow)
6. [Current Attendance Workflow](#6-current-attendance-workflow)
7. [Current Refund Workflow](#7-current-refund-workflow)
8. [Current Sales-Agent Attribution](#8-current-sales-agent-attribution)
9. [Current RBAC](#9-current-rbac)
10. [Current Financial Architecture](#10-current-financial-architecture)
11. [Current Audit Architecture](#11-current-audit-architecture)
12. [Current Notification Architecture](#12-current-notification-architecture)
13. [Commission Specification Analysis](#13-commission-specification-analysis)
14. [Data Gaps](#14-data-gaps)
15. [Architectural Gaps](#15-architectural-gaps)
16. [Business Rule Ambiguities](#16-business-rule-ambiguities)
17. [Proposed Future Architecture](#17-proposed-future-architecture)
18. [Proposed Conceptual Data Model](#18-proposed-conceptual-data-model)
19. [Proposed API Architecture](#19-proposed-api-architecture)
20. [Proposed UI Architecture](#20-proposed-ui-architecture)
21. [Proposed Event Flow](#21-proposed-event-flow)
22. [Transaction & Concurrency Analysis](#22-transaction--concurrency-analysis)
23. [Idempotency Analysis](#23-idempotency-analysis)
24. [Migration Impact](#24-migration-impact)
25. [Risks](#25-risks)
26. [Recommended Implementation Plan](#26-recommended-implementation-plan)
27. [Testing Strategy](#27-testing-strategy)
28. [Files Likely To Be Affected](#28-files-likely-to-be-affected)
29. [Questions Requiring Business Decisions](#29-questions-requiring-business-decisions)
30. [Final Recommendation](#30-final-recommendation)

---

## Legend

| Label | Meaning |
|---|---|
| **FACT** | Confirmed by reading the actual source code |
| **INFERENCE** | Reasoned from the architecture, not explicitly stated in code |
| **PROPOSAL** | Recommended for the future implementation — not yet built |

---

## 1. Executive Summary

**FACT** — After a complete read-only inspection of the Webscale codebase, the existing system contains a well-structured CRM, sales pipeline, payment tracker, and attendance system. However, **zero commission-related infrastructure exists today**. The commission system must be built entirely from scratch.

The good news: the existing data model already captures nearly everything needed to evaluate all five commission scenarios. The `Registration.salesOwnerId` field correctly attributes each sale to the agent who closed it. Payment records are linked to registrations. Attendance is recorded per registration per day.

**The critical gaps are:**

1. No commission rule configuration — no way to define rates, thresholds, or payout policies.
2. No commission calculation engine — no service that evaluates eligibility.
3. No commission ledger — no record of earned, adjusted, or paid-out amounts.
4. No refund approval workflow — refunds currently bypass any approval gate, making Scenario 5 impossible to implement as specified.
5. Agent balance is not tracked anywhere — it would need to be computed dynamically or stored in a new ledger.

Six business rule ambiguities exist that cannot be resolved from the code alone and require explicit decisions before implementation begins.

The estimated implementation scope is **MEDIUM-HIGH** across database, backend, and UI. The financial correctness risk is **CRITICAL** and requires careful transaction design.

---

## 2. Current Architecture

### Framework & Routing

**FACT** — Next.js with App Router. Server Components are the default. All data fetching happens in server components or `"use server"` action files. Client components (`"use client"`) are used only for interactive UI.

### Server Actions Pattern

**FACT** — There are no REST API routes for internal CRM operations. All mutations use Next.js Server Actions (`"use server"` files co-located with pages). Examples: `src/app/(app)/payments/actions.ts`, `src/app/(app)/leads/actions.ts`.

### Authentication

**FACT** — Session-based auth via NextAuth (implied by `Account`, `Session` models in schema). `requirePermissionAction(permission)` and `requirePermissionPage(permission)` are the two auth guards used throughout. Both read the current session and check role-based permissions.

### Database

**FACT** — PostgreSQL via Prisma ORM. Schema at `prisma/schema.prisma`. Monetary values stored as `Decimal @db.Decimal(12,2)` (PostgreSQL `NUMERIC(12,2)`). Some financial queries (expenses) use `prisma.$executeRaw` raw SQL for complex filtering.

### Serialization

**FACT** — Prisma `Decimal` objects are serialized to plain numbers via `Number(String(amount))` before returning to client components. This pattern is consistent across payments and expenses.

---

## 3. Current Data Model

### User / Employee

```
Model:     User
Purpose:   Authentication + employee identity
Fields:    id, name, email, hashedPassword, role (UserRole enum), createdAt, updatedAt
Roles:     ADMIN, MANAGER, SALES, MARKETING, TRAINER, FINANCE, EMPLOYEE
Relations: ownedLeads, assignedLeads, salesRegistrations, recordedPayments,
           activities, tasks, notifications, telegramConnection
Reuse:     YES — User.id will be the FK for commissions (as salesAgentId)
Problems:  No commission-specific fields, no payout bank info, no commission tier
```

### Lead

```
Model:     Lead
Purpose:   Sales pipeline entry — prospect before conversion
Fields:    id, firstName, lastName, email, phone, status (LeadStatus), source,
           ownerId (FK→User, current assigned agent), assignedById, assignedAt,
           courseId, interestedSessionId, studentId (after conversion),
           isHighPriority, nextAction, nextActionDue, createdAt, updatedAt
Relations: owner (current agent), assignments (LeadAssignment audit trail),
           interestedSession, student (after conversion), registrations
Reuse:     PARTIAL — ownerId shows current agent, but lead.ownerId at conversion
           time is NOT guaranteed to match Registration.salesOwnerId
Problems:  Attribution ambiguity: ownerId is mutable; commission must not use it
```

### LeadAssignment

```
Model:     LeadAssignment
Purpose:   Immutable audit trail of every ownership change
Fields:    id, leadId, assignedToId (nullable — null = unassigned),
           assignedById, note, createdAt
Relations: lead, assignedTo (User), assignedBy (User)
Reuse:     YES — useful for historical attribution audits
Problems:  Read-only log; cannot determine "who closed the sale" from this alone
           because the actual closer is stored in Registration.salesOwnerId
```

### Student

```
Model:     Student
Purpose:   Converted customer — person who enrolled in a session
Fields:    id, firstName, lastName, email (unique), phone, notes, tags[],
           nextAction, nextActionDue, nextActionOwnerId, createdAt, updatedAt
Relations: registrations[], payments[], communications[]
Reuse:     INDIRECT — student is the payment payer; commission links through
           Registration, not directly through Student
Problems:  No commission relevance at this level
```

### Registration

```
Model:     Registration
Purpose:   Enrollment record — one student in one session
Fields:    id, studentId, sessionId, leadId,
           status (RegistrationStatus: PENDING, CONFIRMED, ATTENDING, COMPLETED,
                   CANCELLED, NO_SHOW),
           salesOwnerId (FK→User — THE commission attribution field),
           agreedPrice (Decimal 12,2),
           registeredAt, confirmedAt, cancelledAt, source, notes, createdAt, updatedAt
Relations: student, session, lead (source), salesOwner, payments[], attendance[]
Constraints: unique(studentId, sessionId)
Reuse:     CRITICAL — Registration.salesOwnerId IS the sales attribution.
           Registration.agreedPrice IS the base for commission calculation.
Problems:  salesOwnerId can be NULL (walk-in with no assigned agent).
           No "registration completion" flag separate from status.
           NO_SHOW status is set manually — not guaranteed by attendance.
```

### CourseSession

```
Model:     CourseSession
Purpose:   One specific scheduled run of a course
Fields:    id, courseId, title, startDate, endDate, location, city, capacity,
           price (Decimal 12,2), status (SessionStatus: DRAFT, UPCOMING, OPEN,
           FULL, IN_PROGRESS, COMPLETED, CANCELLED), notes, createdAt, updatedAt
Relations: course, instructor, registrations[], attendance[]
Reuse:     YES — session.status = COMPLETED is a candidate trigger for
           final commission evaluation
Problems:  No direct link to commission; used indirectly via registrations
```

### Payment

```
Model:     Payment
Purpose:   Individual money transaction (income or refund)
Fields:    id, studentId, registrationId (nullable),
           amount (Decimal 12,2 — NEGATIVE for refunds),
           currency, method (PaymentMethod enum), status (PaymentStatus),
           reference, notes, paidAt, recordedById, createdAt, updatedAt
Status:    PENDING, COMPLETED, FAILED, REFUNDED
Method:    CASH, BANK_TRANSFER, BANK_CHECK, POSTAL_MOBILE, CARD, ONLINE, OTHER
Reuse:     YES — totalPaid per registration is derived from SUM(amount WHERE
           status=COMPLETED AND amount > 0). Refunds are negative COMPLETED payments.
Problems:  REFUNDED status exists in the enum but is NOT used in production code.
           Refunds = negative amount with status=COMPLETED.
           No approval state. No distinction between deposit and final payment.
           No commission linkage.
```

### Attendance

```
Model:     Attendance
Purpose:   Daily presence record for a student in a session
Fields:    id, registrationId, sessionId, sessionDate (Date only),
           status (AttendanceStatus: PRESENT, ABSENT, LATE, EXCUSED),
           checkInMethod (default="manual"), notes, recordedById, recordedAt
Constraints: unique(registrationId, sessionDate)
Reuse:     YES — PRESENT status is the attendance condition for commission scenarios.
Problems:  No concept of "attended the full course" vs "attended at least one day".
           Attendance can be corrected (upserted) — not immutable.
           Commission scenario is ambiguous about partial attendance.
```

### Expense

```
Model:     Expense
Purpose:   Operational cost tracking
Fields:    id, title, amount, currency, category (ExpenseCategory),
           expenseDate, paymentMethod, courseId, sessionId,
           status (ExpenseStatus: PENDING, CONFIRMED, CANCELLED),
           recordedById, createdAt, updatedAt
Reuse:     NONE — not relevant to commission calculations
```

### Activity

```
Model:     Activity
Purpose:   Append-only audit log for entity state changes
Fields:    id, type (string e.g. "lead.created"), entity (string e.g. "Lead"),
           entityId, userId, meta (Json), createdAt
Reuse:     YES — commission events should be recorded here using new types:
           "commission.earned", "commission.adjusted", "commission.paid"
Problems:  Free-text type and entity — no schema enforcement. meta is untyped Json.
```

### Notification

```
Model:     Notification
Purpose:   In-app and Telegram notification records
Fields:    id, recipientId, type, category (ACTION_REQUIRED, INFO, SUCCESS, SYSTEM),
           title, body, entityType, entityId, read, readAt, priority, createdAt
Reuse:     YES — commission notifications will use same NotificationService.send()
Problems:  No commission-specific notification types defined yet
```

### OrgSettings

```
Model:     OrgSettings
Purpose:   Singleton org configuration (id="default")
Fields:    id, name, currency, timezone, updatedAt
Reuse:     PARTIAL — currency setting relevant to commission display
Problems:  No commission-related settings stored here yet (no default rate,
           no payout schedule, no refund commission policy)
```

---

## 4. Current Sales Workflow

**FACT** — The actual workflow traced from the code:

```
1. Lead created
   → createLead() in leads/actions.ts
   → SALES auto-assigns to self; others → unassigned
   → Activity: "lead.created"

2. Lead assigned (if not self-assigned)
   → updateLeadOwner(leadId, newOwnerId, note)
   → Creates LeadAssignment (immutable log)
   → Lead.status: NEW/ASSIGNED → ASSIGNED
   → Notification: LEAD_ASSIGNED fired to new owner

3. Sales rep qualifies lead
   → Qualifies course interest: updateLeadCourse(leadId, courseId)
   → Assigns session: assignLeadSession(leadId, sessionId)
   → Updates status: ASSIGNED → CONTACTED → INTERESTED → CONFIRMED

4. Lead converted to Student + Registration
   → createRegistrationFromLead(leadId, sessionId, agreedPrice) in leads/actions.ts
   OR convertLead(input) in leads/actions.ts
   → Deduplicates student by email
   → Serializable transaction: capacity check + create Registration
   → Registration.salesOwnerId = session.user.id (the converting agent)
   → Registration.agreedPrice = agreed price
   → Registration.status = CONFIRMED
   → Lead.status = REGISTERED
   → Activity: "lead.converted"
   → Notification: REGISTRATION_CONFIRMED to managers

5. Payment recorded
   → createPayment() or createPaymentForRegistration() in payments/actions.ts
   → Payment linked to studentId + registrationId
   → Balance checked: totalPaid vs agreedPrice
   → Notification: PAYMENT_BALANCE_CLEARED when fully paid

6. Attendance recorded
   → recordAttendance(sessionId, sessionDate, entries) in attendance/actions.ts
   → Upserts Attendance record for each registrationId+sessionDate
   → Session status auto-bumps
   → ABSENT entries trigger ATTENDANCE_NO_SHOW notification

7. Course completion
   → Session.status → COMPLETED (when attendance recorded on last day)
   → No automatic commission trigger currently exists
```

**FACT** — `Registration.salesOwnerId` is set at step 4 (conversion) to `session.user.id` — the logged-in agent performing the conversion. This is the definitive attribution field.

**INFERENCE** — If a manager or admin converts the lead on behalf of a sales agent, the `salesOwnerId` would be the manager, not the original sales rep. This is an attribution ambiguity requiring a business decision.

---

## 5. Current Payment Workflow

**FACT** — Payments work as follows:

- A `Payment` record is created with `registrationId` and `studentId`.
- `agreedPrice` lives on the `Registration`, not on the payment.
- `totalPaid` = `SUM(amount WHERE status=COMPLETED)` — computed dynamically, not stored.
- `remaining` = `agreedPrice - totalPaid` — computed dynamically.
- `paymentStatus` = `UNPAID | PARTIALLY_PAID | FULLY_PAID` — computed dynamically.

**FACT** — No "reservation payment" type exists. There is no field on `Payment` distinguishing a deposit from a final payment. All payments are of the same type — the only distinctions are `method` (CASH, CARD, etc.) and `amount`.

**FACT** — Refunds use negative amounts. A refund is a new `Payment` record with `amount = -X`, `status = COMPLETED`. The `REFUNDED` enum value exists but is not used by the `refundNoShow` function.

**ANSWER: Can the current payment architecture support commission rules without modification?**

Partially. For scenarios 1–4, the payment data is sufficient: we can determine whether `totalPaid >= agreedPrice` (fully paid) or `totalPaid > 0` (any payment made). However:

- Scenario 5 requires a **refund approval gate** that does not exist. Any `payments.write` user can issue a refund immediately.
- There is no "reservation payment" flag — distinguishing scenario 2 from scenario 3 depends purely on the `totalPaid` amount relative to `agreedPrice`.
- The commission calculation engine does not exist at all.

---

## 6. Current Attendance Workflow

**FACT** — Statuses: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`

**FACT** — Attendance is recorded via `recordAttendance()` which upserts one record per `(registrationId, sessionDate)`. It can be corrected: calling it again with different statuses overwrites the previous record.

**FACT** — Attendance is tied to a specific `CourseSession` (via `sessionId`) and a specific date (via `sessionDate`). A multi-day course has one `Attendance` record per day per registered student.

**FACT** — `ABSENT` entries fire `ATTENDANCE_NO_SHOW` notification to managers and sales owner.

**INFERENCE** — For commission purposes, "attended" most naturally means "has at least one `Attendance` record with `status = PRESENT`". However, there is no aggregated "attended this course" boolean flag stored anywhere. This must be computed.

**FACT** — Attendance can be modified after the fact (upsert). This means commission eligibility could change retroactively if attendance is corrected. This is a concurrency and correctness risk.

---

## 7. Current Refund Workflow

**FACT** — There is **no dedicated `Refund` model**. The word "Refund" appears only in:
- `PaymentStatus.REFUNDED` enum value (defined but not used in production code)
- `refundNoShow()` function in `courses/no-shows/actions.ts`

**FACT** — The only refund path in the system today is `refundNoShow(registrationId)`:
1. Validates registration is `NO_SHOW`
2. Creates negative `Payment` records for each completed positive payment
3. Cancels the registration in an atomic transaction
4. No approval step — any `payments.write` user can call it immediately

**FACT** — Current refund code:

```typescript
await prisma.$transaction([
  ...reg.payments.map((p) =>
    prisma.payment.create({
      data: {
        studentId: reg.studentId,
        registrationId,
        amount: -Number(String(p.amount)),  // NEGATIVE amount
        method: "OTHER",
        status: "COMPLETED",
        currency: p.currency ?? "DZD",
        paidAt: new Date(),
        recordedById: authSession.user.id,
        notes: "Refund for no-show",
      },
    })
  ),
  prisma.registration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED" },
  }),
]);
```

**ANSWER: How could a refund trigger a commission adjustment without corrupting historical records?**

**PROPOSAL** — Never modify historical payment or commission records. Instead, create an adjustment ledger entry when a refund is approved:

1. Original earned entry (+amount) — immutable
2. Refund adjustment entry (−amount × refund_commission_rate) — new entry

This preserves historical immutability while reflecting the adjustment. However, this requires building a **refund approval workflow** (currently absent) and a **commission ledger** (currently absent).

---

## 8. Current Sales-Agent Attribution

**FACT** — Attribution is stored in three places:

| Field | Location | Mutable? | Purpose |
|---|---|---|---|
| `Lead.ownerId` | Lead model | YES — changes on reassignment | Current owner of the lead |
| `LeadAssignment.assignedToId` | Separate model | NO — append-only | Full ownership history |
| `Registration.salesOwnerId` | Registration model | YES — set at conversion | Agent who performed the conversion |

**FACT** — When `createRegistrationFromLead()` or `convertLead()` is called, `salesOwnerId` is set to `session.user.id` — the logged-in user at the moment of conversion.

**FACT** — If an ADMIN or MANAGER converts a lead on behalf of a Sales rep, `salesOwnerId` = the admin's ID, not the rep's ID.

**FACT** — There is no `isReassigned` flag, no "original agent" tracking, and no protection against manual `salesOwnerId` updates.

**INFERENCE** — A commission system that relies on `Registration.salesOwnerId` will give commission to whoever pressed the "Convert" button, which may not always be the salesperson who did the work.

---

## 9. Current RBAC

**FACT** — Permissions are defined in `src/lib/permissions.ts`:

```
Gap Analysis for Commission System:

payments.view    → [ADMIN, MANAGER, FINANCE, SALES]
                   Gap: SALES can view payments but not other agents' commissions

payments.write   → [ADMIN, MANAGER, FINANCE, SALES]
                   Gap: SALES should NOT be able to record payouts against themselves

finance.view     → [ADMIN, MANAGER, FINANCE]
                   Gap: NONE for manager commission overview

finance.write    → [ADMIN, FINANCE]
                   Gap: No refund-specific permission exists today

reports.view     → [ADMIN, MANAGER]
                   Gap: SALES agents need to see their own commission report

settings.write   → [ADMIN]
                   Gap: NONE — admin-only is correct for rule configuration
```

**New permissions that would be needed:**

| Permission | Roles | Purpose |
|---|---|---|
| `commissions.view.own` | SALES, EMPLOYEE | See personal commissions |
| `commissions.view.team` | ADMIN, MANAGER | See all agents |
| `commissions.write` | ADMIN, MANAGER | Adjust commissions |
| `commissions.payout` | ADMIN, FINANCE | Record payouts |
| `refunds.approve` | ADMIN, MANAGER, FINANCE | Approve before commission deduction |

---

## 10. Current Financial Architecture

**FACT** — There is **no financial ledger pattern** in the current system. The financial architecture is:

- **Payments**: individual records, balance computed dynamically
- **Expenses**: individual records, totals computed dynamically
- **Transactions page** (`/transactions/actions.ts`): merges Payments + Expenses into a unified view via in-memory sort — not a DB ledger table

**FACT** — No `Balance`, `Ledger`, `Account`, or `Wallet` model exists anywhere in the schema.

**FACT** — The `listLedger()` function dynamically merges payment and expense rows sorted by date. It computes `LedgerSummary` on the fly: `incomeTotal`, `expenseTotal`, `netTotal`. This is a computed view, not a stored ledger.

**INFERENCE** — The current architecture treats financial state as always-computed from raw records. A commission system could follow the same pattern (compute from events) but this has scaling and consistency risks for agent balance display.

**PROPOSAL** — Introduce a `CommissionLedgerEntry` table as an append-only ledger. Do not replicate the dynamic-computation pattern for agent balances — commission ledgers require auditability, immutability, and point-in-time correctness that dynamic computation cannot provide.

---

## 11. Current Audit Architecture

**FACT** — Audit is handled by the `Activity` model via `src/lib/activity.ts`:

```typescript
async function recordActivity(params: {
  type: string       // e.g., "lead.created", "payment.recorded"
  entity: string     // e.g., "Lead", "Payment"
  entityId: string
  userId?: string | null
  meta?: Record<string, unknown>
}): Promise<void>
// Fire-and-forget: creates Activity record, never blocks business logic
```

**FACT** — Activity types currently recorded include: `lead.created`, `lead.converted`, `payment.recorded`, `registration.created`, `lead.status_changed`, etc.

**FACT** — `recordActivity()` is always fire-and-forget — never awaited in business logic paths.

**INFERENCE** — The `Activity` system is a good fit for commission audit events. New types like `commission.earned`, `commission.adjusted`, `commission.paid` would fit the existing pattern naturally.

**PROPOSAL** — Commission events should be recorded to `Activity`. However, the commission ledger itself (with amounts and adjustment history) must be stored in dedicated `CommissionLedgerEntry` records — not inside `Activity.meta` JSON, which is too fragile for financial data.

---

## 12. Current Notification Architecture

**FACT** — Notification delivery is handled by `NotificationService` in `src/lib/notifications/notification-service.ts`:

- `NotificationService.send(intent)` — fire-and-forget
- Runs InApp + Telegram providers in `Promise.allSettled` — failures never propagate to callers
- Persists to `Notification` table for in-app notification center
- Sends to Telegram if user has connected account + preference enabled for that type

**FACT** — Current notification types relevant to commission context include: `PAYMENT_PENDING`, `PAYMENT_RECORDED`, `PAYMENT_CONFIRMED`, `PAYMENT_BALANCE_CLEARED`, `LEAD_ASSIGNED`, `LEAD_REASSIGNED`, `ATTENDANCE_NO_SHOW`, `REGISTRATION_CONFIRMED`.

**INFERENCE** — Commission notifications can be added to the existing `NotificationType` enum and delivered via the existing `NotificationService.send()` infrastructure. No new delivery mechanism is needed.

**PROPOSAL** — New types to add: `COMMISSION_EARNED`, `COMMISSION_ADJUSTED`, `COMMISSION_PAYOUT_PROCESSED`.

---

## 13. Commission Specification Analysis

**Can the current system distinguish all five scenarios?**

### Scenario 1 — Interested, no payment, no attendance → Commission = 0

**DETECTABLE ✓**

- Registration exists with no COMPLETED payments
- No `Attendance` record with `status = PRESENT`
- → Commission = 0

### Scenario 2 — Reservation payment, no attendance → Commission = 0

**PARTIALLY DETECTABLE ⚠**

- Can detect: COMPLETED payment exists, no PRESENT attendance → Commission = 0
- **AMBIGUITY**: "Reservation payment" has no formal definition in the system. It could mean a partial payment (deposit), any payment before the session starts, or a specific payment type.

### Scenario 3 — Reservation payment + attendance + full payment → Commission = 100%

**DETECTABLE ✓**

- `totalPaid >= agreedPrice` (fully paid)
- At least one `Attendance.status = PRESENT` for this registration
- → Commission = 100%

### Scenario 4 — No reservation + attendance + payment at office → Commission = 100%

**PARTIALLY DETECTABLE ⚠**

- Can detect: `totalPaid >= agreedPrice`, PRESENT attendance → Commission = 100%
- **AMBIGUITY**: "Payment at office" is not formally defined. Likely means `Payment.method = CASH` but this is unconfirmed.

### Scenario 5 — Payment + attendance + approved refund → Commission = configurable reduced amount

**NOT FULLY DETECTABLE ✗**

- Can detect payment: ✓
- Can detect attendance: ✓
- Cannot detect "approved refund" — no approval workflow exists
- Cannot apply configurable reduction rate — no `CommissionRule` model exists
- Cannot distinguish a "commission-affecting refund" from a "no-show refund"
- **→ Scenario 5 is blocked by missing infrastructure**

---

## 14. Data Gaps

Items confirmed **MISSING** from the codebase after inspection:

**1. CommissionRule**
No configurable commission rate exists anywhere. No percentage, no threshold, no refund policy. The `OrgSettings` model has no commission fields.

**2. Refund Approval State**
Refunds are immediate. No `pendingApproval`, no `approvedById`, no `approvedAt` on any record. The entire approval workflow required for Scenario 5 is missing.

**3. SalesCommission record**
No model stores an individual computed commission for a given registration. Commission eligibility, amount, and status are nowhere in the schema.

**4. CommissionLedgerEntry**
No append-only ledger of commission events (earned, adjusted, paid).

**5. CommissionPayout**
No model records that an agent was paid their commission (amount, date, method, approvedBy).

**6. Agent balance**
Not stored anywhere. Would need to be computed from ledger entries or maintained as a running balance field.

**7. "Conversion performer" vs "qualifying agent" distinction**
`Registration.salesOwnerId` captures who clicked Convert, not necessarily who did the qualifying sales work.

**8. Commission snapshot at rule time**
No mechanism to freeze the commission rate that applied when a commission was earned. If rules change, historical commissions could be recalculated incorrectly without this snapshot.

**9. Multi-agent split configuration**
No mechanism to split commission between two agents.

**10. Course cancellation handling**
No commission reversal logic exists for cancelled sessions.

---

## 15. Architectural Gaps

**1. No centralized commission calculation service**
No service that takes a `(registrationId)` and returns commission eligibility and computed amount.

**2. No event-driven commission trigger**
No hook is called when payment is completed, attendance is marked, or a refund is approved to evaluate commission eligibility.

**3. No refund approval workflow**
Refunds bypass any gate. Scenario 5 is entirely blocked by this.

**4. No financial ledger for agent balances**
Balance must be computed dynamically or stored. Neither exists for commissions.

**5. No payout subsystem**
No flow for recording that an agent was paid their outstanding commission.

**6. No idempotency key on commission creation**
Multiple triggers (payment event, attendance update, manual recalculation) could create duplicate commissions.

**7. No transaction-safe balance calculation**
Because balance is not stored, there is no DB-level guarantee of consistency under concurrent writes.

**8. No "commission settings" UI**
No admin page to configure rates, policies, or payout schedules.

**9. No commission-specific RBAC permissions**
Current permissions don't distinguish commission reads from payment reads.

---

## 16. Business Rule Ambiguities

These **cannot be decided from the code**. They require explicit business decisions before implementation begins.

---

**Ambiguity 1 — Agent reassignment attribution**

Lead is assigned to Agent A. Agent A works it for two weeks. Manager reassigns to Agent B. Agent B converts. Who earns commission?

Options:
- Last converter (current code behavior — whoever clicks Convert)
- Last owner before conversion
- Original assignee (Agent A)
- Whoever made the most contacts (derived from `LeadAssignment` history)

---

**Ambiguity 2 — Manager-assisted conversion**

A Manager or Admin converts a lead on behalf of a Sales Agent (because the agent is unavailable). `salesOwnerId` will be set to the Manager's ID. Does the sales agent still earn commission? How does the system know who the "real" closer was?

---

**Ambiguity 3 — What exactly is a "reservation payment"?**

The spec mentions "reservation payment but no attendance = 0 commission." Does reservation payment mean:
- Any payment (partial or full)?
- A deposit below a threshold percentage of `agreedPrice`?
- A payment made before the session start date?
- A specific payment category not currently in the system?

---

**Ambiguity 4 — What counts as "attended"?**

For a 10-day course, if a student attends 1 day but misses 9:
- Commission = 100%? (any attendance = eligible)
- Commission = 0%? (must attend a minimum threshold)
- Commission = prorated? (10% attendance = 10% commission)

The current system has no attendance threshold concept.

---

**Ambiguity 5 — Refund after payout**

Agent earns 2,000 DZD commission. Commission is paid out. Student then receives a 50% refund. Does the agent owe the company 1,000 DZD (commission clawback)? Or is the payout final and the loss is absorbed by the company?

---

**Ambiguity 6 — Partial refund**

Student pays 10,000 DZD agreed price. Attends. Receives 3,000 DZD partial refund. Commission was 100%.

- Is commission calculated on 10,000 DZD (full agreed) or 7,000 DZD (net received)?
- Does the refund percentage (30%) reduce commission by 30%? Or by the refund commission rate (e.g., 50%)?

---

**Ambiguity 7 — Course cancellation**

Company cancels a course session after students paid and were registered. Students are refunded. Do agents lose their commission entirely? Is there a partial commission for the qualifying effort?

---

**Ambiguity 8 — Rescheduling**

Student registers with Agent A. Session is rescheduled. Student moves to a new session. Does commission remain with Agent A (original registration), or does it re-evaluate based on the new session's `salesOwnerId`?

---

**Ambiguity 9 — Walk-in registrations (no agent)**

A student walks in and registers with no associated lead and no sales agent (`salesOwnerId = NULL`). No commission is earned by default, or does a pool agent / default agent receive it?

---

**Ambiguity 10 — Manager override**

Should there be a mechanism for a Manager to manually grant commission even if attendance shows NO_SHOW? Or deny commission despite all criteria being met?

---

## 17. Proposed Future Architecture

**PROPOSAL:**

```
Lead
 ↓ (createRegistrationFromLead / convertLead)
Registration
 ├── salesOwnerId → Agent
 ├── agreedPrice
 ↓
Payment Events
 ├── COMPLETED payments
 └── Refund payments (negative)
 ↓
Attendance Events
 └── PRESENT records
 ↓
Commission Engine  (new service: src/lib/commissions/engine.ts)
 ├── evaluateCommission(registrationId) → CommissionEligibility
 ├── Checks all 5 scenarios
 ├── Applies CommissionRule (rate, refund policy)
 └── Idempotent (one Commission per Registration)
 ↓
SalesCommission  (new model)
 ├── registrationId (unique — one commission per registration)
 ├── agentId
 ├── status: PENDING → ELIGIBLE → PAID → ADJUSTED → VOID
 └── amount
 ↓
CommissionLedgerEntry  (new model — append-only)
 ├── EARNED entry (+amount)
 ├── REFUND_ADJUSTMENT entry (-amount)
 └── PAYOUT entry (-amount)
 ↓
CommissionPayout  (new model)
 ├── agentId
 ├── amount
 ├── payoutDate
 └── approvedById
```

---

## 18. Proposed Conceptual Data Model

### CommissionRule

```
Purpose:   Configurable commission policy — one active rule at a time
Why:       Rates and refund policies must be configurable, not hardcoded
Relations: Referenced by SalesCommission (frozen snapshot at earn time)

Fields:
  id                          — unique identifier
  name                        — e.g. "Standard 2026 Policy"
  isActive                    — boolean, only one active rule at a time
  baseRatePercent             — Decimal, e.g. 5.00 for 5%
  refundCommissionRatePercent — Decimal, e.g. 2.50 for 50% of base rate
  requiresFullPayment         — boolean, must be fully paid for full commission
  requiresAttendance          — boolean, must attend at least one day
  minAttendanceDays           — int?, optional minimum days attended
  effectiveFrom               — DateTime
  effectiveTo                 — DateTime?
  createdById, createdAt, updatedAt

Why it can't be replaced by OrgSettings:
  OrgSettings is a singleton; multiple rule versions with effective dates
  cannot be stored there.
```

### SalesCommission

```
Purpose:   One commission record per registration — result of evaluation
Why:       Tracks status of commission lifecycle from PENDING to PAID
Relations: registrationId (unique FK), agentId (FK→User), ruleId (FK→CommissionRule)

Fields:
  id
  registrationId  — unique FK, prevents duplicate commissions
  agentId         — FK→User (from Registration.salesOwnerId at evaluation time)
  ruleId          — FK→CommissionRule (which rule applied)
  ruleSnapshot    — Json, frozen copy of rule at evaluation time
  baseAmount      — Decimal, agreedPrice × rate at time of evaluation
  adjustedAmount  — Decimal, after refund adjustments
  finalAmount     — Decimal, what actually gets paid out
  status          — PENDING | ELIGIBLE | PAID | ADJUSTED | VOID
  scenario        — int 1–5, which scenario was matched
  eligibleAt      — DateTime?, when became eligible
  paidAt          — DateTime?, when payout was recorded
  notes           — String?, manual override reason
  createdAt, updatedAt

Why existing models cannot replace it:
  Without this, commission status is not queryable; it must be recomputed
  every time from payment + attendance data — slow and inconsistent.
```

### CommissionLedgerEntry

```
Purpose:   Append-only financial ledger for all commission movements
Why:       Provides audit trail, prevents data loss on adjustments, enables
           balance computation at any point in time

Fields:
  id
  commissionId  — FK→SalesCommission
  agentId       — FK→User (denormalized for fast balance queries)
  type          — EARNED | REFUND_ADJUSTMENT | PAYOUT | MANUAL_ADJUSTMENT | VOID
  amount        — Decimal, positive = credit, negative = debit
  description   — String
  referenceId   — String?, e.g. refundPaymentId or payoutId
  createdById   — FK→User, who created this entry
  createdAt     — immutable, never updated

Why existing models cannot replace it:
  Running balance = SUM(amount) across all entries for an agent.
  Historical state preserved even after adjustments.
  SalesCommission.adjustedAmount alone erases the history of how the
  adjustment was reached — too fragile for financial audit.
```

### CommissionPayout

```
Purpose:   Record of money transferred to agent as commission payment
Why:       One payout may cover multiple commissions; provides finance audit trail

Fields:
  id
  agentId        — FK→User
  amount         — Decimal, total payout amount
  currency       — String
  method         — PaymentMethod enum (reuse existing)
  reference      — String?, bank transfer ref or receipt number
  notes          — String?
  status         — PENDING | APPROVED | PAID | CANCELLED
  approvedById   — FK→User
  approvedAt     — DateTime?
  paidAt         — DateTime?
  commissionIds  — String[], which SalesCommission records this covers
  createdById, createdAt, updatedAt

Why existing models cannot replace it:
  Closing the loop — agent knows they've been paid, finance has a record,
  and the amount can be reconciled against the bank.
```

### RefundApproval (required for Scenario 5)

```
Purpose:   Approval gate before a refund triggers a commission adjustment
Why:       Currently refunds are immediate. Scenario 5 requires an "approved refund"
           to have a distinct pending state that triggers commission recalculation.

Fields:
  id
  registrationId  — FK→Registration
  requestedById   — FK→User
  requestedAmount — Decimal
  reason          — String
  status          — PENDING | APPROVED | REJECTED
  approvedById    — FK→User?
  approvedAt      — DateTime?
  rejectedAt      — DateTime?
  rejectionReason — String?
  createdAt, updatedAt

Why existing Payment/refundNoShow cannot replace it:
  Current refunds are immediate (no pending state) and tied only to
  NO_SHOW registrations. Scenario 5 needs any payment + attendance + refund,
  not only no-shows.
```

---

## 19. Proposed API Architecture

**PROPOSAL** — All endpoints follow existing Server Actions pattern. Conceptual structure:

### Commission Queries (read)

| Action | Consumer | Purpose |
|---|---|---|
| `getMyCommissions(filters)` | SALES | Personal balance + history |
| `getAgentCommissions(agentId, filters)` | MANAGER | Manager view of one agent |
| `getAllCommissions(filters)` | ADMIN, MANAGER | Team overview |
| `getCommissionDetail(commissionId)` | ADMIN, MANAGER | Full detail + ledger entries |

### Commission Management (write)

| Action | Consumer | Purpose |
|---|---|---|
| `evaluateCommission(registrationId)` | System | Trigger evaluation, create/update SalesCommission |
| `adjustCommission(commissionId, amount, reason)` | MANAGER | Manual override |
| `voidCommission(commissionId, reason)` | ADMIN | Cancel (e.g., course cancellation) |

### Payout Management

| Action | Consumer | Purpose |
|---|---|---|
| `createPayout(agentId, amount, method)` | FINANCE, ADMIN | Record payout |
| `approvePayout(payoutId)` | ADMIN, FINANCE | Approve before payment |
| `cancelPayout(payoutId)` | ADMIN | Cancel before payment |

### Rule Management

| Action | Consumer | Purpose |
|---|---|---|
| `getActiveCommissionRule()` | All | Current active rule |
| `createCommissionRule(input)` | ADMIN | Create new rule version |
| `activateCommissionRule(ruleId)` | ADMIN | Activate (deactivates previous) |

### Refund Approval (Scenario 5)

| Action | Consumer | Purpose |
|---|---|---|
| `requestRefund(registrationId, amount, reason)` | Authorized users | Request a refund |
| `approveRefund(refundApprovalId)` | FINANCE, MANAGER | Approve and trigger adjustment |
| `rejectRefund(refundApprovalId, reason)` | FINANCE, MANAGER | Reject request |

---

## 20. Proposed UI Architecture

**PROPOSAL:**

### Sales Agent

```
Global Header
 └── Outstanding commission chip (SALES role only)
      "DZD 12,500 pending" → links to /my-commissions

/my-commissions  (new page — Sales section of sidebar)
 ├── Summary cards
 │    ├── Total Earned (all time)
 │    ├── Total Paid Out
 │    └── Outstanding Balance
 │
 ├── Commission ledger table
 │    per registration: course, session, agreedPrice,
 │    commission amount, status, earned date, paid date
 │
 └── Payout history
      date, amount, method, reference
```

### Manager

```
/sales  (existing Sales Ops page — new tab added)
 └── "Commissions" tab
      ├── Team overview: per-agent earned / paid / outstanding
      ├── Agent drill-down: their full commission history
      ├── Pending adjustments queue
      └── Payout management (create, approve, track)
```

### Finance

```
/payments  (existing — new tab added)
 └── "Commission Payouts" tab
      ├── Outstanding balances per agent
      ├── Record payout form
      └── Payout history with reconciliation
```

### Admin / Settings

```
/settings  (existing — new section added)
 └── Commission Rules section
      ├── Active rule display (rate, refund policy, effective date)
      ├── Create new rule form
      └── Rule history (past rules with effective dates)
```

---

## 21. Proposed Event Flow

**PROPOSAL:**

### Payment Completed → Commission Evaluation

```
TRIGGER: Payment.status → COMPLETED

evaluateCommission(registrationId)  [idempotent]
  ↓
Check: Registration.salesOwnerId exists?
  → NULL: skip (no agent to attribute)
  ↓
Check: SalesCommission already PAID?
  → YES: skip (immutable — payout already processed)
  ↓
Check: SalesCommission already exists?
  → YES: re-evaluate and update status only
  → NO: create new
  ↓
Fetch: totalPaid, agreedPrice, PRESENT attendance count
  ↓
Apply scenario matrix:
  No payment + no attendance → VOID
  Payment + no attendance    → PENDING (eligible when attendance confirmed)
  Payment + attendance       → ELIGIBLE, amount = rate × agreedPrice
  ↓
Upsert SalesCommission
  ↓
Append CommissionLedgerEntry (type = EARNED)
  ↓
Fire COMMISSION_EARNED notification to agent
```

### Attendance Marked PRESENT → Re-evaluation

```
TRIGGER: Attendance.status → PRESENT

evaluateCommission(registrationId)
  ↓
(Same idempotent flow as above — may flip PENDING → ELIGIBLE)
```

### Refund Approved → Commission Adjustment

```
TRIGGER: RefundApproval.status → APPROVED

Find SalesCommission for registrationId
  ↓
If commission is ELIGIBLE or PAID:
  adjustment = commission.baseAmount × refundCommissionRate
  ↓
  Append CommissionLedgerEntry (type = REFUND_ADJUSTMENT, amount = −adjustment)
  ↓
  Update SalesCommission.adjustedAmount
  If already PAID: status → ADJUSTED (clawback situation)
  ↓
  Fire COMMISSION_ADJUSTED notification to agent
```

### Payout Recorded

```
TRIGGER: CommissionPayout created + approved

For each covered SalesCommission:
  Append CommissionLedgerEntry (type = PAYOUT, amount = −payout share)
  Update SalesCommission.status → PAID
  ↓
Fire COMMISSION_PAYOUT_PROCESSED notification to agent
```

**Where this logic lives:** A new `src/lib/commissions/engine.ts` service. Called from payment actions, attendance actions, and refund approval actions — never directly from UI components.

---

## 22. Transaction & Concurrency Analysis

### Commission Evaluation (CRITICAL)

```
Must be atomic:
  1. SELECT SalesCommission FOR UPDATE (lock the row)
  2. Compute eligibility from payment + attendance
  3. UPSERT SalesCommission
  4. INSERT CommissionLedgerEntry

Race condition: Two concurrent payment events for the same registrationId
both trigger evaluateCommission(). Both read no existing commission, both
attempt to create one → duplicate commissions.

Solution: Unique constraint on SalesCommission.registrationId +
SELECT FOR UPDATE inside a serializable transaction.
```

### Payout Recording (HIGH)

```
Must be atomic:
  1. Read agent's outstanding eligible commissions
  2. CREATE CommissionPayout
  3. INSERT CommissionLedgerEntry (PAYOUT) for each commission covered
  4. UPDATE SalesCommission.status → PAID

Race condition: Two concurrent payout requests for the same agent overlap,
creating duplicate payout records and double-deducting balances.

Solution: Optimistic locking on CommissionPayout + unique payout reference +
serializable transaction.
```

### Refund Approval (HIGH)

```
Must be atomic:
  1. UPDATE RefundApproval.status → APPROVED (state machine check)
  2. CREATE negative Payment record
  3. Compute commission adjustment
  4. INSERT CommissionLedgerEntry (REFUND_ADJUSTMENT)

Race condition: Approval triggered twice → two adjustment ledger entries.

Solution: RefundApproval status transition is a state machine. Once APPROVED,
it cannot be approved again. Enforce in the transaction: check current status,
throw if already APPROVED.
```

### Commission Adjustment (MEDIUM)

```
Must be atomic:
  1. Validate commission is in adjustable state (not VOID)
  2. UPDATE SalesCommission.adjustedAmount
  3. INSERT CommissionLedgerEntry (MANUAL_ADJUSTMENT)
```

---

## 23. Idempotency Analysis

**How duplicate commissions could occur:**

1. **Payment event fires twice** — network retry or optimistic UI retry calls `evaluateCommission()` twice for the same `registrationId`, creating two records if no unique constraint.

2. **Attendance + Payment both trigger evaluation concurrently** — two simultaneous calls for the same `registrationId`.

3. **Manual recalculation button** — if admin clicks "recalculate" twice rapidly.

4. **Background reconciliation job** — if a job runs while a payment event is also in flight.

**Prevention strategy (PROPOSAL):**

- `SalesCommission.registrationId` must have a **unique constraint** at the database level — this is the primary guard.
- `evaluateCommission()` must use `upsert` (`INSERT ... ON CONFLICT UPDATE`) — never plain `create`.
- `CommissionLedgerEntry` type transitions must be validated: only one `EARNED` entry per `commissionId` is ever valid.
- All evaluation logic must execute inside a serializable transaction with `SELECT ... FOR UPDATE` on the commission row.
- Every commission-creating operation should carry an idempotency key derived from `registrationId`.

---

## 24. Migration Impact

| Area | Impact | Reason |
|---|---|---|
| Database | **HIGH** | 4–5 new models, new enums, index additions |
| Backend (services) | **HIGH** | New commission engine service, new server actions |
| API (actions) | **HIGH** | 7–10 new action files |
| Frontend | **MEDIUM** | 3–4 new pages, extensions to existing pages |
| RBAC | **MEDIUM** | 3–5 new permissions in `permissions.ts` |
| Payments | **LOW** | Refund flow extended, not replaced |
| Attendance | **LOW** | Trigger added, no model changes |
| Notifications | **LOW** | New types added to existing system |
| Audit (Activity) | **LOW** | New activity types, same infrastructure |
| Reports | **MEDIUM** | Commission reports added to `/reports` |
| Settings | **MEDIUM** | Commission rules section added |
| Tests | **HIGH** | No commission tests exist; full suite needed from scratch |

---

## 25. Risks

| Risk | Severity | Notes |
|---|---|---|
| Duplicate commissions | **CRITICAL** | Must have unique constraint + idempotent engine from day one |
| Financial incorrectness | **CRITICAL** | Decimal precision must be preserved throughout; never use JS floating point for amounts |
| Incorrect attribution | **HIGH** | Manager-converts-for-agent problem; `salesOwnerId` may not reflect the real closer |
| Refund approval bypass | **HIGH** | If not gated properly, Scenario 5 is permanently broken |
| Historical data integrity | **HIGH** | Retroactive rule changes must not silently alter past commissions |
| Payout concurrency | **HIGH** | Double payout is possible without `SELECT FOR UPDATE` |
| Attendance correction affecting eligibility | **HIGH** | Retroactive attendance change can flip commission eligibility; needs reconciliation trigger |
| `salesOwnerId = NULL` registrations | **MEDIUM** | Walk-in students with no agent; system must handle gracefully |
| Commission on cancelled courses | **MEDIUM** | No void trigger today; must be added |
| Permission escalation | **MEDIUM** | Sales agents must not read other agents' commissions |
| Stale commission snapshots | **MEDIUM** | Rule changes must not silently re-evaluate old commissions |
| Data migration (existing data) | **LOW** | No historical commissions exist; no backfill needed |

---

## 26. Recommended Implementation Plan

> **Phase 1 must complete before Phase 2. Phase 2 before Phase 3. Phases 4–6 can run in parallel after Phase 3. Phases 7–11 can run in parallel after Phase 6.**

### Phase 1 — Business Decisions (BLOCKING prerequisite)

Resolve all 10 ambiguities in Section 16 before writing a single line of implementation code.

### Phase 2 — Database

- Add `CommissionRule`, `SalesCommission`, `CommissionLedgerEntry`, `CommissionPayout`, `RefundApproval` models to `schema.prisma`
- Add unique constraint on `SalesCommission.registrationId`
- Add new RBAC permissions to `permissions.ts`
- Run migration + `prisma generate`

### Phase 3 — Commission Engine (core service)

- Create `src/lib/commissions/engine.ts`
- Implement `evaluateCommission(registrationId)` — idempotent, transactional
- Implement scenario matrix evaluation (1–5)
- Implement `CommissionRule` lookup (active rule at evaluation time)
- Full integration test coverage before proceeding

### Phase 4 — Refund Approval Workflow

- Implement `requestRefund`, `approveRefund`, `rejectRefund` server actions
- `RefundApproval` state machine with transition guards
- Wire approval → commission adjustment via engine

### Phase 5 — Payment + Attendance Triggers

- Call `evaluateCommission()` from `createPayment` / `setPaymentStatus` (fire-and-forget)
- Call `evaluateCommission()` from `recordAttendance` (fire-and-forget)
- Must never block payment recording or attendance recording

### Phase 6 — Payout Subsystem

- Implement `createPayout`, `approvePayout` server actions
- `CommissionPayout` state machine
- Wire payout → `CommissionLedgerEntry` creation + `SalesCommission.status` update

### Phase 7 — Rule Management (Admin UI)

- Add Commission Rules section to `/settings`
- Create / activate rule forms

### Phase 8 — Sales Agent UI

- Create `/my-commissions` page
- Add commission balance chip to global header (SALES role only)

### Phase 9 — Manager / Finance UI

- Add Commissions tab to `/sales` (Sales Ops page)
- Add Commission Payouts tab to `/payments`

### Phase 10 — Notifications

- Add `COMMISSION_EARNED`, `COMMISSION_ADJUSTED`, `COMMISSION_PAYOUT_PROCESSED` to `NotificationType` enum
- Add Telegram message templates for new types

### Phase 11 — Reports

- Add commission report section to `/reports`

### Phase 12 — Testing (spans all phases)

- Write tests as each phase completes
- Do not defer testing to the end

---

## 27. Testing Strategy

### Unit Tests — Commission Engine

| Test | Expected Result |
|---|---|
| `evaluateCommission(Scenario 1)` | Status = VOID, amount = 0 |
| `evaluateCommission(Scenario 2)` | Status = PENDING |
| `evaluateCommission(Scenario 3)` | Status = ELIGIBLE, amount = agreedPrice × rate |
| `evaluateCommission(Scenario 4)` | Status = ELIGIBLE, amount = agreedPrice × rate |
| `evaluateCommission(Scenario 5)` | Status = ELIGIBLE + REFUND_ADJUSTMENT ledger entry |
| `evaluateCommission(salesOwnerId = null)` | No commission created |
| `evaluateCommission(already PAID)` | No modification made |

### Integration Tests — Database

- Duplicate commission prevention: two concurrent evaluations → exactly one record created
- Payout concurrency: two concurrent payouts → only one processed
- Refund approval state machine: cannot approve the same request twice
- `CommissionLedgerEntry` immutability: no UPDATE or DELETE operations permitted

### Permission Tests

| Scenario | Expected |
|---|---|
| SALES agent reads own commissions | Allowed |
| SALES agent reads another agent's commissions | Blocked |
| MANAGER reads all commissions | Allowed |
| MANAGER records a payout | Blocked |
| FINANCE records a payout | Allowed |
| FINANCE modifies commission amount | Blocked |
| ADMIN does all operations | Allowed |

### Financial Consistency Tests

- `CommissionLedgerEntry` SUM = `SalesCommission.finalAmount` for all records
- Agent outstanding balance = SUM(EARNED) − SUM(PAYOUT) for all ledger entries
- No floating-point drift: all Decimal calculations preserve 2 decimal places throughout

### End-to-End Tests (Five Scenarios)

```
Scenario 1: Create lead → convert → no payment → no attendance → assert no commission

Scenario 2: Create lead → convert → record partial payment → no attendance
            → assert commission status = PENDING

Scenario 3: Create lead → convert → record full payment → record PRESENT attendance
            → assert commission status = ELIGIBLE, amount correct

Scenario 4: Create lead → convert → record PRESENT attendance → record full CASH payment
            → assert commission status = ELIGIBLE, amount correct

Scenario 5: Create lead → convert → record full payment → record PRESENT attendance
            → request refund → approve refund
            → assert commission ADJUSTED, adjustment amount = baseAmount × refundRate
```

### Regression Tests

- Existing `createPayment` flow continues to work without commission errors
- Existing `refundNoShow` flow continues to work (no-show path unchanged)
- Attendance recording is unaffected by commission evaluation failures

---

## 28. Files Likely To Be Affected

### Modified Files

```
prisma/schema.prisma
  Why: Add CommissionRule, SalesCommission, CommissionLedgerEntry,
       CommissionPayout, RefundApproval models and new enums
  Risk: HIGH — schema changes require migration + prisma generate + dev server restart

src/lib/permissions.ts
  Why: Add commissions.view.own, commissions.view.team, commissions.write,
       commissions.payout, refunds.approve permissions
  Risk: LOW — additive only

src/lib/notifications/types.ts
  Why: Add COMMISSION_EARNED, COMMISSION_ADJUSTED, COMMISSION_PAYOUT_PROCESSED
       to NotificationType enum
  Risk: LOW — additive only

src/lib/telegram/client.ts
  Why: Add Telegram message templates for new commission notification types
  Risk: LOW — additive only

src/app/(app)/payments/actions.ts
  Why: Call evaluateCommission() after payment status → COMPLETED
  Risk: MEDIUM — must be fire-and-forget; must never block payment recording

src/app/(app)/attendance/actions.ts
  Why: Call evaluateCommission() after PRESENT attendance is recorded
  Risk: MEDIUM — must be fire-and-forget; must never block attendance recording

src/app/(app)/courses/no-shows/actions.ts
  Why: Refund flow may need to route through RefundApproval if Scenario 5
       also affects no-show refunds
  Risk: MEDIUM — behavioral change to existing refund path

src/components/app-shell/nav-config.ts
  Why: Add "My Commissions" link to Sales section for SALES role
  Risk: LOW — additive

src/app/(app)/settings/page.tsx
  Why: Add Commission Rules section
  Risk: LOW — new section, existing page unchanged

src/app/(app)/sales/page.tsx
  Why: Add Commissions tab to Sales Ops for Manager view
  Risk: LOW — new tab, existing tabs unchanged

src/app/(app)/reports/page.tsx
  Why: Add commission report section
  Risk: LOW — additive
```

### New Files (created, not modified)

```
src/lib/commissions/engine.ts           — core evaluation service
src/lib/commissions/types.ts            — commission TypeScript types

src/app/(app)/my-commissions/page.tsx             — agent personal page
src/app/(app)/my-commissions/actions.ts
src/app/(app)/my-commissions/my-commissions-client.tsx

src/app/(app)/settings/commissions/page.tsx       — rule management
src/app/(app)/settings/commissions/actions.ts

src/app/(app)/finance/payouts/page.tsx            — payout management
src/app/(app)/finance/payouts/actions.ts
src/app/(app)/finance/payouts/payouts-client.tsx

src/app/(app)/refunds/page.tsx                    — refund approval queue
src/app/(app)/refunds/actions.ts
src/app/(app)/refunds/refunds-client.tsx
```

---

## 29. Questions Requiring Business Decisions

Before implementation can begin, the following questions must be answered and documented:

1. **Attribution on reassignment** — If a lead changes agent, who earns commission: the last agent before conversion, or whoever clicks Convert?

2. **Manager-assisted conversion** — If a Manager converts a lead for a Sales rep, does the rep get commission? How does the system identify the "real" closer?

3. **Definition of "reservation payment"** — Is it any payment, a partial payment (deposit below a threshold), or a payment made before the session start date?

4. **Attendance threshold** — Does one day of attendance = eligible? Or is there a minimum number of days required?

5. **Refund clawback policy** — If commission is already paid out and a refund is later approved, does the agent owe money back? Or is the payout final?

6. **Partial refund calculation** — Is commission calculated on `agreedPrice` (gross) or `netReceivedAmount` (after refund)?

7. **Course cancellation** — Is commission voided, preserved, or partially awarded when a session is cancelled?

8. **Walk-in students (no agent)** — What happens to commission when `salesOwnerId = NULL`?

9. **Manager override** — Can a Manager manually grant or deny commission regardless of what the system evaluates?

10. **Commission split** — Will any scenario require splitting commission between two agents on the same registration?

---

## 30. Final Recommendation

The existing Webscale codebase is well-structured and contains most of the raw data needed to support a commission system. The data model correctly attributes sales via `Registration.salesOwnerId`, tracks payments with full history, and records attendance per student per day.

**However, implementation cannot begin until three things happen in order:**

**1. Resolve the 10 business ambiguities in Section 29.**
Especially attribution on reassignment, what counts as attendance, and the refund clawback policy. These drive the core commission engine logic. A wrong decision here corrupts financial records.

**2. Design the refund approval workflow.**
Scenario 5 is completely blocked without it. This is not a minor add-on — it changes the existing `refundNoShow` path and requires a new `RefundApproval` model with a proper state machine.

**3. Establish the idempotency strategy before creating any commission records.**
Retrofitting idempotency after duplicate records exist in production is expensive and potentially impossible to reconcile accurately.

### The recommended build order:

> Database → Commission Engine → Refund Approval → Triggers → Payouts → UI → Notifications → Reports → Tests

**Do not start with the UI.** Commission amounts displayed to sales agents must be trustworthy. Trust comes from a correct engine, not a polished interface.

The biggest technical risk is **duplicate commissions**. The biggest business risk is **incorrect attribution**. Both must be solved at the database and service layer before any user-facing feature is built.

---

*Analysis completed: 2026-08-21*
*No source files were modified during this analysis.*
