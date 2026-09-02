import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import {
  LEAD_STATUSES,
  LEAD_FOLLOW_UP_FILTERS,
  LEAD_OWNERSHIP_FILTERS,
  LEAD_CALL_TIME_FILTERS,
} from "@/lib/schemas/lead";

const STATUS_FILTER = ["ALL", ...LEAD_STATUSES] as const;
// Keep in sync with listLeadsSchema.sortBy — anything the API accepts should
// be a legal value here so column-header clicks in the table can commit it.
const SORT_KEYS = [
  "createdAt",
  "firstName",
  "status",
  "email",
  "phone",
  "city",
  "callTime",
] as const;
const SORT_DIRS = ["asc", "desc"] as const;

// URL-backed filter parsers. shallow:false so RSC page re-fetches on change.
export const leadFilters = {
  q: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions({ shallow: false, clearOnDefault: true }),
  courseId: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  followUp: parseAsStringLiteral(LEAD_FOLLOW_UP_FILTERS)
    .withDefault("ALL")
    .withOptions({ shallow: false, clearOnDefault: true }),
  ownership: parseAsStringLiteral(LEAD_OWNERSHIP_FILTERS)
    .withDefault("all")
    .withOptions({ shallow: false, clearOnDefault: true }),
  highPriority: parseAsBoolean
    .withDefault(false)
    .withOptions({ shallow: false, clearOnDefault: true }),
  city: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  callTime: parseAsStringLiteral(LEAD_CALL_TIME_FILTERS)
    .withDefault("ALL")
    .withOptions({ shallow: false, clearOnDefault: true }),
  page: parseAsInteger.withDefault(1).withOptions({ shallow: false, clearOnDefault: true }),
  pageSize: parseAsInteger.withDefault(25).withOptions({ shallow: false, clearOnDefault: true }),
  sortBy: parseAsStringLiteral(SORT_KEYS)
    .withDefault("createdAt")
    .withOptions({ shallow: false, clearOnDefault: true }),
  sortDir: parseAsStringLiteral(SORT_DIRS)
    .withDefault("desc")
    .withOptions({ shallow: false, clearOnDefault: true }),
};
