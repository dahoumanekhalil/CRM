// Lightweight CSV builder — no external dependency needed.
// Handles quoting, embedded quotes, and newlines correctly per RFC 4180.

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the value contains a comma, double-quote, or newline.
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(
  headers: string[],
  rows: unknown[][]
): string {
  const lines: string[] = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return lines.join("\r\n");
}
