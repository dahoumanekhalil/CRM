import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { COURSE_LEVELS, COURSE_STATUSES } from "@/lib/schemas/course";

const STATUS_FILTER = ["ALL", ...COURSE_STATUSES] as const;
const LEVEL_FILTER = ["ALL", ...COURSE_LEVELS] as const;
const SORT_KEYS = ["createdAt", "name", "status", "basePrice"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

export const courseFilters = {
  q: parseAsString.withDefault("").withOptions({ shallow: false, clearOnDefault: true }),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions({ shallow: false, clearOnDefault: true }),
  level: parseAsStringLiteral(LEVEL_FILTER)
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
