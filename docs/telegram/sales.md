# Telegram Notifications — Sales Representative Guide

This guide explains the Webscale CRM Telegram bot for Sales Representatives: how to connect it, which notifications you receive, what each message means, and what action to take.

---

## Table of contents

1. [Connecting your Telegram account](#1-connecting-your-telegram-account)
2. [Bot commands](#2-bot-commands)
3. [Notifications you receive](#3-notifications-you-receive)
4. [What each notification means and what to do](#4-what-each-notification-means-and-what-to-do)
5. [Message examples](#5-message-examples)
6. [Managing notification preferences](#6-managing-notification-preferences)
7. [Anti-spam rules](#7-anti-spam-rules)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Connecting your Telegram account

**Step 1 — Open Telegram and start the bot**

Search for the Webscale CRM bot (ask your manager for the bot username) and press **Start**.

**Step 2 — Get your link token**

In Webscale CRM, go to:
> **Settings → Notifications → Telegram**

Click **Generate Token**. A one-time code appears — it is valid for 15 minutes.

**Step 3 — Send the token to the bot**

In Telegram, type:

```
/start YOUR_TOKEN_HERE
```

You will receive:

> ✅ **Account linked successfully!**
> You will now receive notifications here.

Done. Your notifications will start arriving immediately.

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

As a Sales Representative, you receive notifications scoped to **your own leads and customers only**. You will not see alerts for other reps' leads.

### Your tasks

| Notification | Trigger | Default |
|---|---|---|
| **Task assigned** | A task is assigned to you | ✅ On |
| **Task reminder** | 30 minutes before a task is due | ✅ On |
| **Overdue tasks** | Daily alert when you have overdue tasks | ✅ On |

### Your leads

| Notification | Trigger | Default |
|---|---|---|
| **Lead assigned** | A lead is assigned to you for the first time | ✅ On |
| **Lead reassigned** | A lead from another rep is transferred to you | ✅ On |

### Your registrations

| Notification | Trigger | Default |
|---|---|---|
| **Registration confirmed** | One of your leads is confirmed for a course run — by you or your manager | ✅ On |
| **Registration cancelled** | A registration of one of your students is cancelled | ✅ On |
| **Course run changed** | A student's session is moved to a different run | ✅ On |

### Payments for your students

| Notification | Trigger | Default |
|---|---|---|
| **Payment recorded** | A payment is logged for one of your students (recorded by someone else) | ✅ On |
| **Payment confirmed** | A pending payment of your student is confirmed by Finance | ✅ On |
| **Payment rejected** | A payment of your student is rejected | ✅ On |
| **Balance cleared** | One of your students pays their full balance | ✅ On |
| **Outstanding balance** | A reminder that one of your students has an unpaid balance | ✅ On |

### Course runs (for your students)

| Notification | Trigger | Default |
|---|---|---|
| **Rescheduled** | A course run your students are enrolled in changes dates | ✅ On |
| **Location changed** | A course run's venue changes | ✅ On |
| **Cancelled** | A course run your students are enrolled in is cancelled | ✅ On |

### Attendance (for your students)

| Notification | Trigger | Default |
|---|---|---|
| **No show** | One of your students is marked ABSENT during attendance | ✅ On |

### Daily Digest

| Notification | Trigger | Default |
|---|---|---|
| **Daily digest** | Your personal summary — your leads, follow-ups, and registrations | ❌ Off (opt-in) |

---

## 4. What each notification means and what to do

### Lead assigned — new lead for you

**When:** Your manager assigns a new lead to you.

**Message:**
```
👤 New Lead

Ahmed Benali has been assigned to you.
Digital Marketing Fundamentals
```

**Action:** Open the lead in the CRM, review their profile, and make first contact within 24 hours. Set a follow-up task immediately.

---

### Lead reassigned — transferred from another rep

**When:** A lead previously handled by a colleague is transferred to you.

**Message:**
```
🔄 Lead Assigned to You

Khalid Mansouri

This lead was transferred to you from Sara Khelil.
Python for Data Science
```

**Action:** Review the lead's history and any existing notes before making contact. The previous rep's follow-up notes are visible in the lead's activity timeline.

---

### Task assigned

**When:** Your manager or the system assigns a task to you.

**Message:**
```
📋 New task assigned to you

Call Ahmed Benali to confirm course date
⏰ Due: Jan 15, 2026
```

**Action:** Open the Tasks section and complete it before the due date.

---

### Task reminder

**When:** 30 minutes before a task's due time.

**Message:**
```
🔔 Reminder

Your task is due in 30 minutes.
Call Ahmed Benali to confirm course date
```

**Action:** Complete the task now.

---

### Overdue tasks

**When:** Sent daily if you have tasks past their due date.

**Message:**
```
⚠️ Overdue Tasks

You have 3 overdue tasks.
```

**Action:** Go to Tasks in the CRM and clear the backlog. Overdue tasks are visible to your manager.

---

### Registration confirmed

**When:** One of your leads is successfully registered and confirmed for a course run.

**Message:**
```
🎓 New Confirmed Registration

Ahmed Benali

Course: Digital Marketing Fundamentals
Course Run: Feb 3, 2026
Sales Representative: You
Payment: Unpaid
```

**Action:** The registration is confirmed, but payment is still outstanding. Follow up with the student about the first payment within 48 hours.

---

### Payment rejected

**When:** Finance rejects a payment submitted for one of your students.

**Message:**
```
❌ Payment Rejected

Ahmed Benali

45,000 DZD
Method: Bank Transfer

Reason: Could not be verified
```

**Action:** Contact the student immediately. Ask them to provide a valid payment proof or use another payment method. A rejected payment is visible to your manager.

---

### Balance cleared

**When:** One of your students has paid their full course amount.

**Message:**
```
✅ Payment Completed

Ahmed Benali
Digital Marketing Fundamentals

Full amount paid: 90,000 DZD
Balance: 0 DZD
```

**Action:** No action required — this is a positive confirmation. The student's registration is now fully paid.

---

### Outstanding balance reminder

**When:** Sent when a student under your care has an unpaid or partially paid registration.

**Message:**
```
💰 Payment Follow-up

Ahmed Benali

Remaining: 45,000 DZD
```

**Action:** Contact the student and arrange payment. Unpaid balances that pass the course start date become difficult to collect.

---

### Course run rescheduled 🚨

**When:** A course run that your students are enrolled in changes its dates.

**Message:**
```
🚨 Course Run Rescheduled

Digital Marketing Fundamentals

Old: Jan 15 – Jan 17, 2026
New: Feb 3 – Feb 5, 2026

Affected registrations: 12
```

**Action:** Contact each of your affected students personally to confirm they can attend the new dates. If a student cannot make the new dates, inform your manager — a transfer to another run or a refund may be needed.

---

### Course run cancelled 🚨

**When:** A course run your students are enrolled in is cancelled.

**Message:**
```
🚨 Course Run Cancelled

Digital Marketing Fundamentals
Jan 15 – Jan 17, 2026

Affected registrations: 12

Please contact affected customers.
```

**Action:** This is urgent. Contact each of your affected students immediately. Offer them the next available run or escalate to your manager for a refund decision.

---

### Course run location changed

**When:** The venue of a session changes.

**Message:**
```
📍 Course Location Changed

Digital Marketing Fundamentals
Jan 15 – Jan 17, 2026

Previous: El Aurassi Hotel, Algiers
New: Hilton Garden Inn, Algiers
```

**Action:** Forward the new location details to your registered students for this run.

---

### No show

**When:** A trainer records attendance and one of your students is marked ABSENT.

**Message:**
```
⚠️ No Show

Ahmed Benali

Python for Data Science
Jan 15, 2026
```

**Action:** Call or message the student to find out what happened. If they missed a day of a multi-day course, confirm they will attend the remaining days. Repeated absences should be flagged to your manager.

---

### Registration cancelled

**When:** A registration for one of your students is cancelled.

**Message:**
```
❌ Registration Cancelled

Ahmed Benali

Digital Marketing Fundamentals
Feb 3, 2026

Paid: 45,000 DZD

A financial follow-up may be required.
```

**Action:** If the student already made a payment, coordinate with Finance about the refund. Update the lead's status in the CRM.

---

### Daily digest (when enabled)

Your personal digest — shows only your own pipeline data.

**Message:**
```
📊 Your Daily Summary

New Leads Assigned: 2
Follow-ups Today: 5
Overdue: 1
Confirmed Registrations: 1
Outstanding Customers: 3
```

**Action:** Use this as your morning checklist. Start with overdue items, then today's follow-ups.

---

## 5. Message examples

### Multiple leads assigned at once

When your manager bulk-assigns leads, you receive one grouped message instead of many:

```
📥 New Leads Assigned

You received 6 new leads to follow up.
```

Open My Leads in the CRM to see the full list.

---

## 6. Managing notification preferences

Go to **Settings → Notifications** in the CRM.

Toggle each notification type on or off. The changes take effect immediately.

**Recommended Sales Rep setup:**

| Notification | Recommended |
|---|---|
| Lead assigned / reassigned | ✅ Always on — act fast on new leads |
| Task assigned + reminder | ✅ Always on |
| Registration confirmed | ✅ Always on |
| Payment rejected | ✅ Always on — requires immediate student contact |
| Course run cancelled / rescheduled | ✅ Always on |
| No show | ✅ Always on |
| Balance cleared | ✅ On — positive confirmation |
| Outstanding balance | ✅ On — financial follow-up |
| Payment recorded | Optional — on by default, can disable if noisy |
| Daily digest | Optional — enable for a morning summary of your pipeline |

---

## 7. Anti-spam rules

- **You only see your own leads** — you will never receive notifications about another rep's customers.
- **Self-notification blocked** — if you record a payment yourself, you will not receive the "payment recorded" notification for it.
- **Burst protection** — if many events happen at once (e.g., bulk assignment), notifications are paced and delivered within a few minutes rather than all at once.
- **Capacity alerts go to managers only** — course run capacity alerts (80%, 90%, full) are sent to Admins and Managers, not to Sales Reps.

---

## 8. Troubleshooting

### I am not receiving notifications

1. Type `/status` in the bot. If it shows "Not connected", follow the steps in section 1 again.
2. Check **Settings → Notifications** — the notification type may be toggled off.

### I received a notification for a lead that is not mine

This should not happen — the system scopes lead and payment notifications to the owning sales rep. If you see this, report it to your manager.

### I want to stop receiving notifications temporarily

You can mute the Telegram conversation directly in the Telegram app (long-press the chat → Mute). Notifications will still be delivered but your phone will not make noise.

To permanently disable a notification type, go to **Settings → Notifications** in the CRM.

### I want to disconnect

Go to **Settings → Notifications → Telegram** and click **Disconnect**. You can reconnect any time with a new token.
