import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { CAMPAIGN_STATUSES } from "@/lib/schemas/campaign";

const STATUS_FILTER = ["ALL", ...CAMPAIGN_STATUSES] as const;
const SORT_KEYS = ["createdAt", "name", "status", "startDate"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const campaignFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  page: parseAsInteger.withDefault(1).withOptions(shallowFalse),
  pageSize: parseAsInteger.withDefault(25).withOptions(shallowFalse),
  sortBy: parseAsStringLiteral(SORT_KEYS)
    .withDefault("createdAt")
    .withOptions(shallowFalse),
  sortDir: parseAsStringLiteral(SORT_DIRS)
    .withDefault("desc")
    .withOptions(shallowFalse),
};
