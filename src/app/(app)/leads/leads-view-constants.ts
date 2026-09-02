import { VISIBLE_LEAD_STATUSES, type VisibleLeadStatus } from "@/lib/schemas/lead";

// Rows-per-page options for the leads views. Kept above the DataTable default
// so users can pull large CSV imports into a single page. Server-side max is
// 500 (listLeadsSchema.pageSize).
export const LEADS_TABLE_PAGE_SIZE_OPTIONS: number[] = [25, 50, 100, 200, 500];

// Statuses shown as columns in the kanban board view — same set the toolbar
// exposes as tabs, minus terminal/dead-end states that would just clutter.
export const LEADS_BOARD_STATUSES: readonly VisibleLeadStatus[] =
  VISIBLE_LEAD_STATUSES;

// Column definitions for the visibility menu. Order here drives the order of
// items in the "Columns" dropdown. `required: true` = always shown, can't be
// hidden (checkbox is disabled). Default-off columns are turned on only when
// the user opts in — keeps the initial table tidy after a fresh install.
export type LeadColumnKey =
  | "select"
  | "name"
  | "status"
  | "contact"
  | "email"
  | "phone"
  | "city"
  | "owner"
  | "course"
  | "tags"
  | "lastNote"
  | "callTime"
  | "priority"
  | "createdAt"
  | "actions";

export const LEADS_COLUMN_DEFS: ReadonlyArray<{
  id: LeadColumnKey;
  label: string;
  required?: boolean;
  defaultVisible: boolean;
}> = [
  { id: "name",       label: "Lead",              required: true, defaultVisible: true },
  { id: "status",     label: "Status",            defaultVisible: true },
  { id: "contact",    label: "Contact",           defaultVisible: true },
  { id: "email",      label: "Email",             defaultVisible: false },
  { id: "phone",      label: "Phone",             defaultVisible: false },
  { id: "city",       label: "City",              defaultVisible: true },
  { id: "callTime",   label: "Best time to call", defaultVisible: true },
  { id: "lastNote",   label: "Last note",         defaultVisible: true },
  { id: "owner",      label: "Owner",             defaultVisible: false },
  { id: "course",     label: "Course",            defaultVisible: false },
  { id: "tags",       label: "Tags",              defaultVisible: false },
  { id: "priority",   label: "Priority",          defaultVisible: false },
  { id: "createdAt",  label: "Created",           defaultVisible: false },
];

export const LEADS_DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> =
  Object.fromEntries(LEADS_COLUMN_DEFS.map((c) => [c.id, c.defaultVisible]));

// localStorage keys. Version suffix lets us invalidate stale prefs if the
// shape ever changes without silently corrupting user state.
export const LEADS_VIEWS_STORAGE_KEY = "webscale.leads.view.v1";
export const LEADS_COLUMNS_STORAGE_KEY = "webscale.leads.columns.v1";
