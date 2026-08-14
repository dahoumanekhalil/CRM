import { parseAsInteger, parseAsString } from "nuqs";

const shallowFalse = { shallow: false, clearOnDefault: true } as const;

export const instructorFilters = {
  q: parseAsString.withDefault("").withOptions(shallowFalse),
  page: parseAsInteger.withDefault(1).withOptions(shallowFalse),
};
