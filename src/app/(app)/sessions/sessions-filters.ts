import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { SESSION_STATUSES } from "@/lib/schemas/session";

const STATUS_FILTER = ["ALL", ...SESSION_STATUSES] as const;
const WHEN_FILTER = ["ALL", "UPCOMING", "PAST"] as const;
const SORT_KEYS = ["startDate", "createdAt", "status"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const sessionFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  courseId: parseAsString.withDefault("").withOptions(shallowFalse),
  when: parseAsStringLiteral(WHEN_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  page: parseAsInteger.withDefault(1).withOptions(shallowFalse),
  pageSize: parseAsInteger.withDefault(25).withOptions(shallowFalse),
  sortBy: parseAsStringLiteral(SORT_KEYS)
    .withDefault("startDate")
    .withOptions(shallowFalse),
  sortDir: parseAsStringLiteral(SORT_DIRS)
    .withDefault("asc")
    .withOptions(shallowFalse),
};
