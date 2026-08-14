import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/schemas/payment";

const STATUS_FILTER = ["ALL", ...PAYMENT_STATUSES] as const;
const METHOD_FILTER = ["ALL", ...PAYMENT_METHODS] as const;

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const transactionFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  from: parseAsString.withDefault("").withOptions(shallowFalse),
  to: parseAsString.withDefault("").withOptions(shallowFalse),
  status: parseAsStringLiteral(STATUS_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  method: parseAsStringLiteral(METHOD_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
  currency: parseAsString.withDefault("ALL").withOptions(shallowFalse),
  page: parseAsInteger.withDefault(1).withOptions(shallowFalse),
  pageSize: parseAsInteger.withDefault(25).withOptions(shallowFalse),
};
