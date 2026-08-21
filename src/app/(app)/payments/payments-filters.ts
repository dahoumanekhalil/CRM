import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/schemas/payment";

const STATUS_FILTER = ["ALL", ...PAYMENT_STATUSES, "OUTSTANDING"] as const;
const METHOD_FILTER = ["ALL", ...PAYMENT_METHODS] as const;
const SORT_KEYS = ["createdAt", "paidAt", "amount", "status"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const paymentFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  method: parseAsStringLiteral(METHOD_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  studentId: parseAsString.withDefault("").withOptions(shallowFalse),
  page: parseAsInteger.withDefault(1).withOptions(shallowFalse),
  pageSize: parseAsInteger.withDefault(25).withOptions(shallowFalse),
  sortBy: parseAsStringLiteral(SORT_KEYS)
    .withDefault("createdAt")
    .withOptions(shallowFalse),
  sortDir: parseAsStringLiteral(SORT_DIRS)
    .withDefault("desc")
    .withOptions(shallowFalse),
};
