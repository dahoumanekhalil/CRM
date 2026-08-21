import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { PAYMENT_STATUS_FILTERS } from "@/lib/schemas/student";

const SORT_KEYS = ["createdAt", "firstName", "lastName"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const studentFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  tag: parseAsString.withDefault("").withOptions(shallowFalse),
  paymentStatus: parseAsStringLiteral(PAYMENT_STATUS_FILTERS)
    .withDefault("all")
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
