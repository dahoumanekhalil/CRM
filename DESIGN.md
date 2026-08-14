# Webscale — Product & Design System

> **Purpose of this document.** This is the single source of truth for the product vision, design system, UX rules, and technical stack of Webscale. Anyone (human or AI assistant) working on this codebase MUST read this file before making design, UX, or UI decisions. Every screen, component, and interaction should be evaluated against the rules in this document.

---

## 0. How to use this document

- **Before building any screen**, re-read sections 3–5 (Design Philosophy, Visual Direction, Design System) and section 27 (UX Rules).
- **Before shipping any screen**, evaluate it against section 35 (Final Quality Standard).
- **When creating new components**, follow section 29 (Component Architecture) and reuse the primitives in section 30.
- **When adding animations**, follow sections 16 and 25 — animations must be purposeful, not decorative.
- **When adding new text or content**, both English (LTR) and Arabic (RTL) must work — see section 24.
- **When in doubt**, favor clarity over decoration, simplicity over configurability, and consistency over novelty.

---

## Table of contents

1. [Technology stack](#1-technology-stack)
2. [Product vision](#2-product-vision)
3. [Design philosophy](#3-design-philosophy)
4. [Visual direction](#4-visual-direction)
5. [Design system](#5-design-system)
6. [Application layout](#6-application-layout)
7. [Dashboard](#7-dashboard)
8. [CRM lead management](#8-crm-lead-management)
9. [Customer / student profile](#9-customer--student-profile)
10. [Course management](#10-course-management)
11. [Course creation form](#11-course-creation-form)
12. [Landing page builder](#12-landing-page-builder)
13. [Landing page block system](#13-landing-page-block-system)
14. [Templates](#14-templates)
15. [Landing page preview](#15-landing-page-preview)
16. [Landing page visual quality](#16-landing-page-visual-quality)
17. [Forms UX](#17-forms-ux)
18. [Tables UX](#18-tables-ux)
19. [Empty states](#19-empty-states)
20. [Loading states](#20-loading-states)
21. [Feedback system](#21-feedback-system)
22. [Responsive design](#22-responsive-design)
23. [Accessibility](#23-accessibility)
24. [Internationalization & Arabic (RTL)](#24-internationalization--arabic-rtl)
25. [Micro-interactions](#25-micro-interactions)
26. [Performance](#26-performance)
27. [UX rules](#27-ux-rules)
28. [Do NOT build a generic admin dashboard](#28-do-not-build-a-generic-admin-dashboard)
29. [Component architecture](#29-component-architecture)
30. [Design consistency — reusable primitives](#30-design-consistency--reusable-primitives)
31. [Command menu](#31-command-menu)
32. [Keyboard & productivity UX](#32-keyboard--productivity-ux)
33. [Error handling](#33-error-handling)
34. [Security & permission UX](#34-security--permission-ux)
35. [Final quality standard — pre-ship checklist](#35-final-quality-standard--pre-ship-checklist)
36. [Final objective](#36-final-objective)

---

## 1. Technology stack

### Core

- **Next.js** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS v4**
- **React 19**

### UI

- **shadcn/ui** — primary UI foundation
- **Base UI / Radix primitives** — where appropriate
- **Lucide React** — icons (only library, must be consistent)
- **Motion** (formerly Framer Motion) — animations & transitions

### Forms & validation

- **React Hook Form** — form state
- **Zod** — schema validation (shared client + server)

### Data & tables

- **TanStack Query** — client-side data fetching, caching, mutations
- **TanStack Table** — headless table logic

### Additional

- **Recharts** — analytics charts
- **dnd-kit** — drag-and-drop (page builder, table reorder)
- **Tiptap** — rich text editing
- **Sonner** — toast notifications
- **date-fns** — date handling
- **nuqs** — URL/search/filter state

### Visual enhancement (marketing surfaces only)

- **Aceternity UI / Magic UI** — selectively for landing pages and premium visual effects. **Do NOT use these in the internal CRM.**

### Rules

- Do **not** introduce multiple libraries for the same purpose (one icon lib, one data-fetching lib, one form lib, one date lib).
- The project must have **one coherent design system**.

---

## 2. Product vision

Webscale is an **internal CRM platform for a company that provides in-person educational and training courses (دورات تدريبية وتعليمية حضورية)**.

The product must feel like a **professional SaaS product** — combining the usability and clarity of Linear, Notion, Stripe, and Vercel, while the landing-page creation experience should feel inspired by Framer and Webflow, but considerably simpler for non-technical employees.

The primary objective:

> **Make the system extremely easy for employees to use while maintaining a premium, beautiful, modern, highly polished interface.**

Users must not need technical knowledge to operate the CRM or create a landing page.

### Two major areas

**A. Internal CRM** — used by employees to manage:

- Leads
- Customers
- Students
- Courses
- Training sessions
- Course registrations
- Attendance
- Payments
- Employees
- Instructors
- Marketing campaigns
- Communications
- Landing pages
- Analytics
- Reports
- Settings

**B. Landing Page Builder** — employees create beautiful landing pages for courses without writing code. The flow:

```
Create Course → Create Landing Page → Choose Template → Customize Content → Preview → Publish
```

The employee edits **content**, not CSS.

---

## 3. Design philosophy

### Clarity over decoration
Never add visual effects because they look impressive. Every element must have a functional purpose.

### Minimal cognitive load
Employees should immediately understand: where they are, what they can do, what needs attention, what to do next.

### Progressive disclosure
Do not show every option at once. Show essential controls first; reveal advanced settings only when needed.

### Strong visual hierarchy
Every screen must clearly distinguish: page title, primary action, secondary actions, important information, status, metadata, supporting information.

### Consistency
Buttons, forms, dialogs, tables, cards, spacing, typography, colors, icons, and interactions must behave consistently throughout the application.

---

## 4. Visual direction

The visual style should be:

- Premium
- Modern
- Minimal
- Elegant
- Professional
- Clean
- Responsive
- High contrast where necessary
- Spacious without wasting screen space
- Subtle rather than flashy

**Inspiration:** Linear, Stripe, Vercel, Notion, Raycast, Apple, modern SaaS products.

Use these as reference for spacing, hierarchy, interaction quality, typography, navigation, visual polish, information architecture. **Do not copy them.**

---

## 5. Design system

Create the design system **before** implementing individual pages.

### 5.1 Typography

Use a professional modern sans-serif — **Geist** (default), Inter, or equivalent.

**Type scale:**

| Role     | Size       |
| -------- | ---------- |
| Display  | 48–64 px   |
| H1       | 36–48 px   |
| H2       | 28–36 px   |
| H3       | 20–24 px   |
| Body     | 14–16 px   |
| Small    | 12–13 px   |

Do not use excessive font sizes.

### 5.2 Spacing

Consistent scale (px):

```
4, 8, 12, 16, 24, 32, 48, 64, 96, 128
```

Map these to Tailwind's spacing tokens directly (`space-1`, `space-2`, `space-3`, `space-4`, `space-6`, `space-8`, `space-12`, `space-16`, `space-24`, `space-32`).

### 5.3 Border radius

```
sm, md, lg, xl, 2xl
```

Feel soft and modern without making every element excessively rounded. Inputs and buttons: `md`. Cards and panels: `lg`–`xl`. Modals: `xl`–`2xl`.

### 5.4 Shadows

Prioritize **border + surface/background contrast + subtle elevation** over heavy floating shadows. Reserve strong shadows for overlays (dropdowns, popovers, modals).

### 5.5 Color system

- **Restrained neutral base** — neutral background, neutral cards, neutral borders.
- **One strong primary color** (used for primary CTAs, active states, key highlights).
- **Semantic colors**: success (green), warning (amber), error (red), info (blue).
- Do not introduce many unrelated accent colors.
- Use color to **communicate meaning**, not decoration.

Support both **light and dark themes** as first-class citizens.

---

## 6. Application layout

Responsive application shell.

**Desktop:**

```
┌────────────────────────────────────────────────────────────┐
│ Top Bar                                                    │
├───────────────┬────────────────────────────────────────────┤
│               │                                            │
│ Sidebar       │ Main content                               │
│ Navigation    │                                            │
│               │                                            │
└───────────────┴────────────────────────────────────────────┘
```

**Sidebar states:** expanded, collapsed, mobile drawer.

**Navigation grouping (do not overload):**

```
Overview

Sales
  Leads
  Customers
  Students

Courses
  All Courses
  Sessions
  Attendance

Marketing
  Campaigns
  Landing Pages

Finance
  Payments
  Transactions

Reports

Settings
```

Icons: **Lucide React only**. Meaningful and consistent — one icon per concept across the whole app.

---

## 7. Dashboard

Communicate the health of the business immediately.

### KPI cards
Examples: Total Leads, New Leads, Registered Students, Revenue, Conversion Rate, Active Courses.

Each card shows: **current value, comparison to previous period, trend indicator, optional context**.

```
Registered Students
384
+18.4%   vs previous month
```

### Analytics
Recharts. Possible: registrations over time, leads over time, revenue, course performance, conversion rate, attendance, lead source performance. **Readable and restrained — do not make dashboards visually noisy.**

---

## 8. CRM lead management

Lead table (TanStack Table) supports:

- search, filtering, sorting, pagination
- column visibility
- status, source, assigned employee, date, tags
- bulk actions

**Statuses:** `New`, `Contacted`, `Interested`, `Registered`, `Lost`, `Follow-up`.

Use clear visual **StatusBadge** components (see §30).

---

## 9. Customer / student profile

Not a database record — a **workspace**.

**Header:** name, avatar, status, phone, email, primary actions.

**Tabs:** `Overview`, `Courses`, `Payments`, `Attendance`, `Communications`, `Notes`, `Activity`.

Overview aggregates: registration history, courses, payments, attendance, communications, notes, activity timeline.

---

## 10. Course management

**Course fields:** name, description, instructor, category, price, duration, start date, end date, location, capacity, current registrations, status.

**Statuses:** `Draft`, `Upcoming`, `Open`, `Full`, `In Progress`, `Completed`, `Cancelled`.

**Obvious actions:** Edit, Duplicate, Publish, Create Landing Page, View Students.

---

## 11. Course creation form

Divide into logical sections. **Never a single giant form.**

Sections: `Basic Information`, `Pricing`, `Schedule`, `Instructor`, `Location`, `Capacity`, `Media`, `Marketing`, `SEO`.

Use sections / tabs / accordions / progressive steps when appropriate. Show **inline validation** — never rely only on a submit-time error.

---

## 12. Landing page builder

The most important visual feature.

**Layout:**

```
┌──────────────┬──────────────────────────────┬──────────────┐
│ Components   │                              │ Properties   │
│              │                              │              │
│ Hero         │                              │ Title        │
│ Text         │      LIVE PAGE PREVIEW       │ Description  │
│ Image        │                              │ Button       │
│ Video        │                              │ Image        │
│ Features     │                              │ Colors       │
│ Pricing      │                              │ Spacing      │
│ Instructor   │                              │              │
│ Testimonials │                              │              │
│ FAQ          │                              │              │
│ CTA          │                              │              │
└──────────────┴──────────────────────────────┴──────────────┘
```

Use **dnd-kit**.

**Employees can:** add, remove, duplicate, reorder blocks; edit text; replace images; edit buttons; edit colors; adjust spacing within limits; preview desktop / tablet / mobile.

**Do NOT expose:** raw CSS controls, arbitrary HTML, unbounded configurability. This is a builder for employees, not developers.

---

## 13. Landing page block system

Reusable blocks. All should be data-driven (see §29 for the `LandingBlock` type).

- **Hero** — headline, subtitle, CTA, course image/video, trust indicator
- **Benefits** — "What you will learn"
- **Course Information** — date, duration, location, price, capacity
- **Instructor** — photo, name, bio, experience
- **Curriculum** — modules, lessons, topics
- **Testimonials** — student name, avatar, testimonial, rating
- **Pricing** — price, offer, payment info, CTA
- **FAQ** — accordion
- **Social Proof** — student count, companies, certifications, statistics
- **CTA** — strong final conversion section

---

## 14. Templates

Never make employees start from a blank page.

**Templates:** `Business Course`, `Marketing Course`, `AI Course`, `Technology Course`, `Leadership Course`, `Workshop`, `Intensive Training`.

Each template ships with: layout, spacing, typography, sections, animations, responsive behavior, CTA hierarchy. Employees only customize content.

---

## 15. Landing page preview

**Device switcher:** Desktop, Tablet, Mobile.

**Actions:** Preview, Save, Publish, Unpublish, Duplicate.

**Status must always be visible:** `Saved`, `Unsaved`, `Published`, `Draft`.

---

## 16. Landing page visual quality

Landing pages are more expressive than the internal CRM.

Use **Motion** and selectively **Aceternity UI / Magic UI**.

**Acceptable effects:** subtle hero entrance, text reveal, scroll reveal, animated gradient, subtle background motion, image hover, card interactions, CTA micro-interactions.

**Do NOT:** animate every element, use distracting parallax everywhere, use excessive gradients, make text unreadable, sacrifice performance for visual effects.

Animation must improve **storytelling and conversion**.

---

## 17. Forms UX

Rules:

- clear labels
- useful placeholders
- inline validation
- sensible defaults
- correct input types (`email`, `tel`, `number`, `date`, etc.)
- keyboard-friendly navigation
- loading states
- disabled states
- success feedback
- error recovery

Stack: **React Hook Form + Zod** — validation schema is shared with the server API route.

---

## 18. Tables UX

TanStack Table. Every table supports where appropriate: search, filtering, sorting, pagination, column visibility, row selection, bulk actions, responsive behavior, empty states, loading states, error states.

**Avoid unnecessarily dense tables** — comfortable row height is the default.

---

## 19. Empty states

Never a blank screen. Every empty state answers:

1. What happened?
2. Why is it empty?
3. What should the user do?

Example:

```
No landing pages yet

Create your first landing page for a course
and start receiving registrations.

[ Create Landing Page ]
```

---

## 20. Loading states

- Use **skeletons** rather than blank content.
- Avoid excessive spinners.
- Use skeleton cards, tables, lists.
- **Optimistic updates** where safe (mutations that rarely fail).

---

## 21. Feedback system

**Sonner** for lightweight feedback:

```
✓ Course created successfully
✓ Landing page published
✓ Student registered
✓ Changes saved
```

Dialogs only for **important decisions**. Do not confirm every action.

---

## 22. Responsive design

Works on desktop, laptop, tablet, mobile.

- **Internal CRM:** desktop-first (employees mostly work from desktop).
- **Landing pages:** **mobile-first and conversion-focused**.

---

## 23. Accessibility

Non-negotiable. Ensure:

- semantic HTML
- keyboard navigation
- visible focus states
- correct labels
- sufficient contrast (WCAG AA minimum)
- accessible dialogs, dropdowns, forms, tables
- screen-reader-friendly controls

Never sacrifice accessibility for visual design.

---

## 24. Internationalization & Arabic (RTL)

Arabic is a primary language for the business. Support:

```
RTL, LTR, Arabic text, English text
```

**Rules:**

- Never hardcode directional assumptions (no `margin-left`, `padding-right`, `left-0`, etc. as first choice).
- Use **logical CSS properties** and Tailwind's logical utilities:
  - `margin-inline`, `padding-inline`, `inset-inline`
  - `text-start`, `text-end`
  - `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`
- UI must not break when Arabic content becomes longer than English content.
- Icons that imply direction (arrows, chevrons) must flip in RTL.

Set `dir="rtl"` on `<html>` for Arabic locale; all layout should adapt automatically.

---

## 25. Micro-interactions

Subtle interactions: hover, focus, pressed, success feedback, smooth transitions, drag feedback, button feedback, skeleton transitions.

Use **Motion selectively**. The interface should feel responsive and alive **without feeling like an animation showcase**.

Default transition: `duration-150 ease-out`. Overlays: `duration-200`. Page transitions: minimal or none — snappy > cinematic.

---

## 26. Performance

The app must remain fast.

- **Server Components** by default; Client Components only when needed.
- Lazy loading + dynamic imports for heavy features (page builder, rich editor, charts).
- `next/image` for all images.
- TanStack Query caching + pagination.
- **Virtualization** when datasets exceed ~200 rows.
- Avoid shipping unnecessary JavaScript.

Target: `Interaction to Next Paint` < 200 ms on all core interactions.

---

## 27. UX rules

Apply throughout the entire product.

1. **One primary action per screen.**
2. Do not make users search for common actions.
3. Prefer sensible defaults.
4. Do not ask users to configure things they do not understand.
5. Use progressive disclosure.
6. Never make an employee think about technical implementation.
7. Always provide feedback after important actions.
8. Make destructive actions explicit and recoverable where possible.
9. Keep navigation predictable.
10. Maintain visual consistency everywhere.

---

## 28. Do NOT build a generic admin dashboard

This is critical. Do **not** create:

- generic sidebar
- generic cards
- generic table
- generic blue buttons
- generic chart

The final product must feel **intentionally designed**. Every major screen must have: strong hierarchy, purposeful spacing, thoughtful interactions, meaningful empty states, meaningful loading states, polished responsive behavior, consistent visual language.

---

## 29. Component architecture

**Folder structure:**

```
components/
  ui/                 # shadcn primitives
  layout/             # app shell, sidebar, topbar
  navigation/         # nav items, breadcrumbs
  forms/              # form primitives
  tables/             # DataTable + column defs
  charts/             # Recharts wrappers
  crm/                # CRM-specific composites
  courses/
  leads/
  students/
  landing-builder/    # editor UI (canvas, inspector, toolbox)
  landing-blocks/     # renderable blocks (Hero, FAQ, CTA, ...)
  analytics/
  shared/             # cross-cutting composites
```

**Landing blocks are data-driven.** The builder stores structured page data, never arbitrary HTML.

```ts
type LandingBlock =
  | HeroBlock
  | CourseOverviewBlock
  | InstructorBlock
  | CurriculumBlock
  | TestimonialsBlock
  | PricingBlock
  | FAQBlock
  | CTABlock;

type LandingPage = {
  id: string;
  slug: string;
  status: "draft" | "published";
  blocks: LandingBlock[];
  theme: { primary: string; radius: "sm" | "md" | "lg" | "xl" };
  seo: { title: string; description: string; ogImage?: string };
};
```

---

## 30. Design consistency — reusable primitives

Build once, reuse everywhere. Never redesign these ad-hoc.

- `PageHeader` — title, description, primary action, breadcrumbs
- `SectionHeader` — section title + optional action
- `StatCard` — KPI with delta + trend
- `StatusBadge` — semantic status pill (uses shared status → color mapping)
- `EmptyState` — icon, headline, description, CTA
- `ConfirmDialog` — destructive action confirmation
- `DataTable` — TanStack Table wrapper with search, filters, pagination, column vis
- `FilterBar` — filter chips, saved filters (nuqs-backed)
- `SearchInput` — debounced search with keyboard shortcut hint
- `FormSection` — label, description, field group, footer
- `ActivityTimeline` — chronological events with icons
- `EntityCard` — clickable summary card for leads, courses, students
- `DrawerForm` — side-drawer create/edit form
- `CommandMenu` — global ⌘K menu (see §31)

---

## 31. Command menu

Global command menu — one of the most important productivity features.

**Shortcut:** `⌘K` (macOS) / `Ctrl+K` (Windows/Linux).

**Example commands:**

```
Search...

Create Course
Create Lead
Create Student
Create Landing Page
Search Students
Search Courses
Open Settings
```

Commands must be scoped by permission (see §34). Recent commands surface first.

---

## 32. Keyboard & productivity UX

Employees using the system daily should work fast.

Support: keyboard navigation everywhere, command menu, quick create (`c` shortcut), useful shortcuts, **preserved filters** (nuqs URL state), saved searches, bulk operations.

---

## 33. Error handling

Errors must be understandable. **Never** display raw HTTP errors.

**Bad:**

```
500 Internal Server Error
```

**Good:**

```
We couldn't save the course.

Your changes are still here.
Please try again.

[ Try Again ]
```

Technical details available to admins via a "Details" disclosure, never as the primary message.

---

## 34. Security & permission UX

Roles: `Admin`, `Manager`, `Sales`, `Marketing`, `Trainer`, `Finance`, `Employee`.

- **Hide** actions the user cannot perform — do not merely disable them.
- If an action must be shown but disabled, explain **why** on hover / tooltip.
- Never expose data the user is not authorized to see.

---

## 35. Final quality standard — pre-ship checklist

Before considering any page complete, evaluate as a senior UX designer:

- [ ] Can a new employee understand this immediately?
- [ ] Is the primary action obvious?
- [ ] Is there strong visual hierarchy?
- [ ] Are all states complete (default, hover, focus, active, disabled, loading, empty, error)?
- [ ] Is loading handled (skeletons, optimistic updates)?
- [ ] Is error handling handled (recoverable, human language)?
- [ ] Is the empty state useful (explains what/why/next)?
- [ ] Is the page responsive on desktop, tablet, mobile?
- [ ] Does Arabic RTL work end-to-end?
- [ ] Is the interface accessible (keyboard, contrast, labels)?
- [ ] Does the page feel premium?
- [ ] Is there unnecessary complexity to remove?
- [ ] Are animations purposeful, not decorative?
- [ ] Are interactions consistent with the rest of the app?

Any "no" is a blocker.

---

## 36. Final objective

The final product must feel like:

> **A premium SaaS CRM built specifically for a training and education company — with an extremely simple internal workflow and a powerful but employee-friendly landing-page builder.**

Visually impressive when presented to management or clients, but most importantly **fast, intuitive, predictable, and easy for non-technical employees to use every day**.

Do not optimize for showing off technology.

Optimize for:

> **UX → clarity → speed → consistency → conversion → maintainability.**

Build the interface as if it will be used by **hundreds of employees** and will become the **central operating system of the company**.
