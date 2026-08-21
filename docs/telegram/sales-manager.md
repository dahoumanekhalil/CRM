# Telegram Notifications — Sales Manager Guide

This guide explains how the Webscale CRM Telegram bot works for Sales Managers: how to connect it, which notifications you receive, what action each message requires, and how to tune your preferences.

---

## Table of contents

1. [Connecting your Telegram account](#1-connecting-your-telegram-account)
2. [Bot commands](#2-bot-commands)
3. [Notifications you receive](#3-notifications-you-receive)
4. [What each notification means and what to do](#4-what-each-notification-means-and-what-to-do)
5. [Message examples](#5-message-examples)
6. [Managing notification preferences](#6-managing-notification-preferences)
7. [Notification priority levels](#7-notification-priority-levels)
8. [Anti-spam rules](#8-anti-spam-rules)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Connecting your Telegram account

**Step 1 — Open Telegram and start the bot**

Search for the Webscale CRM bot in Telegram (ask your administrator for the bot username) and press **Start**.

**Step 2 — Get your link token**

In Webscale CRM, go to:
> **Settings → Notifications → Telegram**

Click **Generate Token**. You will see a one-time code valid for 15 minutes.

**Step 3 — Send the token to the bot**

In Telegram, type:

```
/start YOUR_TOKEN_HERE
```

You will receive:

> ✅ **Account linked successfully!**
> You will now receive notifications here.

Done. Notifications will begin arriving immediately.

---

## 2. Bot commands

| Command | Description |
|---|---|
| `/start <token>` | Connect your CRM account (initial setup) |
| `/link <token>` | Alternative linking command |
| `/status` | Check whether your account is connected |
| `/notifications` | View your current notification settings |
| `/help` | Show all available commands |

---

## 3. Notifications you receive

As a Sales Manager, you receive alerts across your team's pipeline and the course run schedule. The table below covers every notification type you will see.

### Your tasks

| Notification | Trigger | Default |
|---|---|---|
| **Task assigned** | A task is assigned to you | ✅ On |
| **Task reminder** | 30 minutes before a task is due | ✅ On |
| **Overdue tasks** | Daily alert when you have overdue tasks | ✅ On |

### Team & leads (most important for Sales Managers)

| Notification | Trigger | Default |
|---|---|---|
| **Lead assigned** | Any lead is assigned to a sales rep | ✅ On |
| **Lead reassigned** | A lead is transferred from one rep to another | ✅ On |
| **Unassigned leads alert** | Active leads have no assigned rep — requires your action | ✅ On |
| **Team overdue alert** | One or more reps have overdue follow-ups | ✅ On |

### Registrations

| Notification | Trigger | Default |
|---|---|---|
| **Registration confirmed** | A new confirmed registration is created by any rep | ✅ On |
| **Registration cancelled** | A registration is cancelled | ✅ On |
| **Course run changed** | A student's session is moved to a different run | ✅ On |

### Course Runs

| Notification | Trigger | Default |
|---|---|---|
| **Near capacity (80%)** | A course run fills to 80% | ✅ On |
| **Near capacity (90%)** | A course run fills to 90% | ✅ On |
| **Capacity reached** | A course run is fully booked | ✅ On |
| **Rescheduled** | A course run's dates are changed | ✅ On |
| **Location changed** | A course run's venue is changed | ✅ On |
| **Cancelled** | A course run is cancelled | ✅ On |
| **Course run reminder** | 1 hour before a run starts (for runs with your team's registrations) | ✅ On |

### Payments

| Notification | Trigger | Default |
|---|---|---|
| **Payment pending** | A payment awaits confirmation | ✅ On |
| **Payment recorded** | A completed payment is logged | ✅ On |
| **Payment confirmed** | A pending payment is confirmed | ✅ On |
| **Payment rejected** | A payment is rejected | ✅ On |
| **Balance cleared** | A student's full balance is paid | ✅ On |
| **Outstanding balances** | Daily summary of all registrations with unpaid balances | ✅ On |

### Attendance

| Notification | Trigger | Default |
|---|---|---|
| **No show** | A student on your team's registrations is marked ABSENT | ✅ On |

### Daily Digest

| Notification | Trigger | Default |
|---|---|---|
| **Daily digest** | Company-wide morning summary | ❌ Off (opt-in) |

---

## 4. What each notification means and what to do

### Unassigned leads alert

**When:** Sent periodically when active leads have no assigned sales rep.

**Message:**
```
🔔 Leads Waiting for Assignment

5 active leads have no Sales Representative.
```

**Action:** Open Webscale → Sales → Leads → Unassigned and distribute them to your reps. Unassigned leads lose value quickly.

---

### Team overdue alert

**When:** Sent when one or more of your reps have leads past their follow-up due date.

**Message:**
```
⚠️ Sales Follow-up Alert

Youcef Hamdi — 4 overdue
Sara Khelil — 2 overdue
```

**Action:** Contact the rep directly or reassign the overdue leads. Use the CRM workload view to see the full picture.

---

### Registration confirmed

**When:** A rep completes a lead conversion and the registration is confirmed.

**Message:**
```
🎓 New Confirmed Registration

Ahmed Benali

Course: Digital Marketing Fundamentals
Course Run: Feb 3, 2026
Sales Representative: Sara Khelil
Payment: Unpaid
```

**Action:** This is good news — no immediate action needed. If payment is "Unpaid", your team should follow up for the first payment within 48 hours.

---

### Course run near capacity

**When:** Automatic — fires when registrations hit 80% and again at 90%.

**80% message:**
```
📊 Course Run Near Capacity

Python for Data Science

24 / 30 seats filled
80%

6 seats remaining
```

**90% message:**
```
📊 Course Run Near Capacity

Python for Data Science

27 / 30 seats filled
90%

3 seats remaining
```

**Action:** This is an opportunity. Prioritize any pending leads interested in this course — they may not get a seat if they wait.

---

### Course run full

**When:** The last seat is taken.

**Message:**
```
🔴 Course Run Full

Python for Data Science

30 / 30 seats filled.

No seats remaining.
```

**Action:** Stop sending new leads to this run. If you have leads still interested, find the next available run and assign it to them.

---

### Course run rescheduled 🚨

**When:** Staff edits a session's start or end date.

**Message:**
```
🚨 Course Run Rescheduled

Digital Marketing Fundamentals

Old: Jan 15 – Jan 17, 2026
New: Feb 3 – Feb 5, 2026

Affected registrations: 12
```

**Action:** Coordinate with your team. Each rep should personally contact their registered students. The instructor has also been notified.

---

### Course run cancelled 🚨

**When:** A session is cancelled.

**Message:**
```
🚨 Course Run Cancelled

Advanced Excel for Professionals
Jan 20 – Jan 22, 2026

Affected registrations: 8

Please contact affected customers.
```

**Action:** Urgent. Assign each of the 8 affected registrants to a rep and track the outreach. Offer an alternative run or a refund.

---

### No show

**When:** Attendance is recorded and a student is marked ABSENT.

**Message:**
```
⚠️ No Show

Khalid Mansouri

Python for Data Science
Jan 15, 2026
```

**Action:** The responsible rep also receives this alert. Check that they follow up with the student within 24 hours.

---

### Outstanding balances (daily)

**When:** Sent once per day, company-wide.

**Message:**
```
💰 Outstanding Balances

23 registrations have remaining balances.

Total outstanding: 1,240,000 DZD
```

**Action:** Review the Finance → Payments section to see which registrations are overdue and assign follow-up tasks to the appropriate reps.

---

### Daily digest (when enabled)

**Message:**
```
📊 Today's Summary — Jan 15, 2026

New Leads: 7
Unassigned: 2
Confirmed Registrations: 3
Payments Received: 135,000 DZD
Outstanding: 870,000 DZD
Upcoming Course Runs: 4
Overdue Leads: 6
```

**Action:** Use this as your morning check-in. If "Unassigned" is non-zero, that is your first priority.

---

## 5. Message examples

### Payment rejected

```
❌ Payment Rejected

Ahmed Benali

45,000 DZD
Method: Bank Transfer

Reason: Could not be verified
```

> The Sales rep who owns this lead also receives this alert. Ensure they follow up with the student to provide a valid payment.

---

### Balance cleared

```
✅ Payment Completed

Ahmed Benali
Digital Marketing Fundamentals

Full amount paid: 90,000 DZD
Balance: 0 DZD
```

> No action required. This is a confirmation that a student has paid in full.

---

## 6. Managing notification preferences

Go to **Settings → Notifications** in the CRM.

Toggle individual notification types on or off. Changes take effect immediately.

**Recommended Sales Manager setup:**

| Notification | Recommended |
|---|---|
| Unassigned leads alert | ✅ Always on |
| Team overdue alert | ✅ Always on |
| Registration confirmed | ✅ Always on |
| Course run cancelled / rescheduled | ✅ Always on |
| Course run full | ✅ Always on |
| Payment pending | ✅ On |
| No show | ✅ On |
| Daily digest | Optional — enable for a morning overview |
| Payment recorded (every individual payment) | Optional — can be noisy with a large team |

---

## 7. Notification priority levels

| Priority | Examples |
|---|---|
| 🔴 CRITICAL | Course cancelled, course rescheduled |
| 🟠 HIGH | Near capacity (90%), payment rejected, no show |
| 🟡 NORMAL | Registration confirmed, payment recorded, balance cleared |
| ⚪ LOW | Daily digest |

CRITICAL and HIGH notifications are always delivered promptly. NORMAL and LOW notifications respect any quiet-hour settings.

---

## 8. Anti-spam rules

- **Capacity thresholds fire once per level** — you get one alert at 80%, one at 90%, one at 100% for each course run. No repeats.
- **Self-notification blocked** — if you confirm a payment yourself, you will not receive the confirmation notification for it.
- **Burst protection** — maximum 20 notifications delivered per 5-minute window. If a bulk operation (e.g., importing 50 leads) triggers many events, they are paced automatically.
- **Daily digest deduplicates** — you receive exactly one digest per day, even if the cron job runs more than once.

---

## 9. Troubleshooting

### I am not receiving notifications

1. Type `/status` in the bot. If it says "Not connected", redo the connection steps in section 1.
2. Check **Settings → Notifications** — the notification type may be toggled off.

### I receive too many notifications

Reduce volume by disabling lower-priority types:
- **Payment recorded** — noisy if your team processes many payments per day. Disable it and rely on the daily digest instead.
- **Lead assigned** — you may not need real-time alerts for every individual lead assignment.

### The bot says "Connected" but nothing arrives

Contact your system administrator to verify that the Telegram bot token and webhook are correctly configured on the server.

### I want to disconnect

Go to **Settings → Notifications → Telegram** and click **Disconnect**.
