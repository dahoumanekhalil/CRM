import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { LANDING_PAGE_STATUSES } from "@/lib/schemas/landing-page";

const STATUS_FILTER = ["ALL", ...LANDING_PAGE_STATUSES] as const;
const SORT_KEYS = ["updatedAt", "title", "status"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

export const landingPageFilters = {
  q: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions({ shallow: false, clearOnDefault: true }),
  page: parseAsInteger.withDefault(1).withOptions({ shallow: false, clearOnDefault: true }),
  pageSize: parseAsInteger.withDefault(25).withOptions({ shallow: false, clearOnDefault: true }),
  sortBy: parseAsStringLiteral(SORT_KEYS)
    .withDefault("updatedAt")
    .withOptions({ shallow: false, clearOnDefault: true }),
  sortDir: parseAsStringLiteral(SORT_DIRS)
    .withDefault("desc")
    .withOptions({ shallow: false, clearOnDefault: true }),
};
