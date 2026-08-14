import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { LEAD_STATUSES } from "@/lib/schemas/lead";

const STATUS_FILTER = ["ALL", ...LEAD_STATUSES] as const;
const SORT_KEYS = ["createdAt", "firstName", "status"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

// URL-backed filter parsers. shallow:false so RSC page re-fetches on change.
export const leadFilters = {
  q: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions({ shallow: false, clearOnDefault: true }),
  courseId: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  page: parseAsInteger.withDefault(1).withOptions({ shallow: false, clearOnDefault: true }),
  pageSize: parseAsInteger.withDefault(25).withOptions({ shallow: false, clearOnDefault: true }),
  sortBy: parseAsStringLiteral(SORT_KEYS)
    .withDefault("createdAt")
    .withOptions({ shallow: false, clearOnDefault: true }),
  sortDir: parseAsStringLiteral(SORT_DIRS)
    .withDefault("desc")
    .withOptions({ shallow: false, clearOnDefault: true }),
};
