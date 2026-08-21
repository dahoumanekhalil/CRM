# Telegram Notifications — Admin Guide

This guide covers everything an Admin needs to know about the Webscale CRM Telegram bot: how to connect it, which notifications you receive, what each message means, and how to manage your preferences.

---

## Table of contents

1. [Connecting your Telegram account](#1-connecting-your-telegram-account)
2. [Bot commands](#2-bot-commands)
3. [Notifications you receive](#3-notifications-you-receive)
4. [Message examples](#4-message-examples)
5. [Managing notification preferences](#5-managing-notification-preferences)
6. [Notification priority levels](#6-notification-priority-levels)
7. [Anti-spam rules](#7-anti-spam-rules)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Connecting your Telegram account

**Step 1 — Open Telegram and start the bot**

Search for the Webscale CRM bot in Telegram (ask your system administrator for the bot username) and press **Start**.

**Step 2 — Get your link token**

In Webscale CRM, go to:
> **Settings → Notifications → Telegram**

Click **Generate Token**. You will see a one-time code (valid for 15 minutes).

**Step 3 — Send the token to the bot**

In your Telegram conversation with the bot, type:

```
/start YOUR_TOKEN_HERE
```

You will receive a confirmation message:

> ✅ **Account linked successfully!**
> You will now receive notifications here.

Your account is now connected. Notifications will start arriving immediately.

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

As Admin, you receive the broadest set of notifications. The table below shows every type and its default state.

### Tasks

| Notification | Trigger | Default |
|---|---|---|
| **Task assigned** | A task is assigned to you | ✅ On |
| **Task reminder** | 30 minutes before a task is due | ✅ On |
| **Overdue tasks** | Daily alert when you have overdue tasks | ✅ On |

### Course Runs (الدورات الجارية)

| Notification | Trigger | Default |
|---|---|---|
| **Near capacity (80%)** | A course run reaches 80% of its seats | ✅ On |
| **Near capacity (90%)** | A course run reaches 90% of its seats | ✅ On |
| **Capacity reached** | A course run is fully booked | ✅ On |
| **Course run reminder** | 1 hour before a course run starts | ✅ On |
| **Course run today** | Morning alert when sessions run today | ✅ On |
| **Rescheduled** | A course run's dates are changed | ✅ On |
| **Location changed** | A course run's location is changed | ✅ On |
| **Cancelled** | A course run is cancelled | ✅ On |

### Payments

| Notification | Trigger | Default |
|---|---|---|
| **Payment pending** | A payment is entered as PENDING and awaits your confirmation | ✅ On |
| **Payment recorded** | A completed payment is logged (by anyone other than you) | ✅ On |
| **Payment confirmed** | A pending payment is confirmed | ✅ On |
| **Payment rejected** | A payment is rejected | ✅ On |
| **Balance cleared** | A student's full balance is paid | ✅ On |

### Leads & Sales

| Notification | Trigger | Default |
|---|---|---|
| **Lead assigned** | A lead is assigned to a sales rep | ✅ On |
| **Lead reassigned** | A lead moves from one rep to another | ✅ On |
| **Unassigned leads alert** | Active leads exist without an assigned rep | ✅ On |
| **Team overdue alert** | Sales reps have overdue follow-ups | ✅ On |

### Registrations

| Notification | Trigger | Default |
|---|---|---|
| **Registration confirmed** | A new confirmed registration is created | ✅ On |
| **Registration cancelled** | A registration is cancelled | ✅ On |
| **Course run changed** | A student's registration is moved to a different run | ✅ On |

### Finance

| Notification | Trigger | Default |
|---|---|---|
| **Outstanding balances** | Daily summary of all unpaid/partial registrations | ✅ On |
| **High expense alert** | An expense exceeds the configured threshold | ✅ On |

### Attendance

| Notification | Trigger | Default |
|---|---|---|
| **No show** | A student marked ABSENT during attendance recording | ✅ On |

### Daily Digest

| Notification | Trigger | Default |
|---|---|---|
| **Daily digest** | Company-wide summary sent every morning | ❌ Off (opt-in) |

> **Note:** The daily digest is off by default. Enable it in **Settings → Notifications** if you want a morning summary.

---

## 4. Message examples

### Payment pending

```
💳 Payment Awaiting Confirmation

Ahmed Benali

Amount: 45,000 DZD
Method: Bank Transfer

This payment is still awaiting confirmation.
```

> **Action:** Go to Payments in the CRM and confirm or reject the payment.

---

### Course run rescheduled 🚨

```
🚨 Course Run Rescheduled

Digital Marketing Fundamentals

Old: Jan 15 – Jan 17, 2026
New: Feb 3 – Feb 5, 2026

Affected registrations: 12
```

> **Action:** Verify the change is intentional and contact affected students if needed.

---

### Course run cancelled 🚨

```
🚨 Course Run Cancelled

Advanced Excel for Professionals
Jan 20 – Jan 22, 2026

Affected registrations: 8

Please contact affected customers.
```

> **Action:** Coordinate with Sales to contact the 8 affected registrants.

---

### Course run full

```
🔴 Course Run Full

Project Management Professional (PMP)

30 / 30 seats filled.

No seats remaining.
```

---

### No show

```
⚠️ No Show

Khalid Mansouri

Python for Data Science
Jan 15, 2026
```

> **Action:** The student's sales rep has also received this alert and should follow up.

---

### Unassigned leads alert

```
🔔 Leads Waiting for Assignment

5 active leads have no Sales Representative.
```

> **Action:** Go to Sales → Leads → Unassigned and distribute them.

---

### Team overdue alert

```
⚠️ Sales Follow-up Alert

Youcef Hamdi — 4 overdue
Sara Khelil — 2 overdue
Amine Touati — 1 overdue
```

> **Action:** Check the workload view and help reps prioritize.

---

### Outstanding balances summary

```
💰 Outstanding Balances

23 registrations have remaining balances.

Total outstanding: 1,240,000 DZD
```

---

### Daily digest (when enabled)

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

---

## 5. Managing notification preferences

Go to **Settings → Notifications** in the CRM.

Each notification type has a toggle. Changes take effect immediately — you do not need to reconnect the bot.

**Recommended admin setup:**

- Keep all CRITICAL and HIGH alerts on (rescheduled, cancelled, capacity reached, payment rejected)
- Enable the daily digest if you want a morning business overview
- You can turn off lower-priority alerts (payment recorded, lead assigned) if volume is too high

---

## 6. Notification priority levels

The system classifies every notification by urgency. Higher priority notifications are sent even if you have temporary quiet periods configured.

| Priority | Color | Examples |
|---|---|---|
| 🔴 CRITICAL | Red | Course cancelled, course rescheduled |
| 🟠 HIGH | Orange | Near capacity (90%), payment rejected, no show |
| 🟡 NORMAL | Yellow | Payment recorded, registration confirmed |
| ⚪ LOW | Grey | Daily digest, overdue task counts |

---

## 7. Anti-spam rules

The system has built-in protections to prevent notification flooding:

- **Capacity thresholds are sent once per threshold** — you receive one alert at 80%, one at 90%, and one at 100% for each course run. The same alert will not repeat until the next registration cycle.
- **Self-notification is blocked** — if you confirm a payment yourself, you will not receive the "payment confirmed" notification for it.
- **Burst protection** — no more than 20 notifications per 5 minutes are delivered to any one recipient. Excess notifications are queued and delivered shortly after.
- **Scheduled notifications deduplicate** — the daily digest and other cron-based alerts use unique IDs to prevent duplicate delivery even if the cron job runs multiple times.

---

## 8. Troubleshooting

### I am not receiving any notifications

1. Type `/status` in the bot — if it says "Not connected", your account is not linked. Repeat the connection steps in section 1.
2. Check **Settings → Notifications** and verify that the relevant notification types are enabled.
3. If the bot says "Connected" but notifications are still not arriving, contact your system administrator to check the bot configuration.

### The bot stopped responding

The bot only responds to commands (messages starting with `/`). Regular text is ignored.

### I want to disconnect

Go to **Settings → Notifications → Telegram** and click **Disconnect**. You can reconnect at any time by generating a new token.

### Notifications are in Arabic but I want English (or vice versa)

Language preference is managed per account. Contact your system administrator — language settings will be configurable in a future update.
