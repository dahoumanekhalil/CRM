import { parseAsString, parseAsStringLiteral } from "nuqs";

const WHEN_FILTER = [
  "ALL",
  "TODAY",
  "IN_PROGRESS",
  "UPCOMING",
  "PAST",
] as const;

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const attendanceFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  courseId: parseAsString.withDefault("").withOptions(shallowFalse),
  when: parseAsStringLiteral(WHEN_FILTER)
    .withDefault("ALL")
    .withOptions(shallowFalse),
};
