// Minimal slugifier — ASCII lowercase, spaces/underscores → hyphen,
// strips non-alphanumeric, collapses repeats, trims edges.
// Enough for course/landing-page slugs. Not a replacement for a proper
// i18n slugger if we need Arabic/CJK slugs later.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
