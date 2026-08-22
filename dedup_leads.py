"""
dedup_leads.py
==============
Deduplicates two lead CSV files based on normalized phone numbers.

Logic:
1. Parse both files.
2. Normalize phones: strip non-digits, keep LAST 9 digits as canonical key.
3. Exclude phones that appear in BOTH files (cross-file duplicates).
4. Within each file, keep only the most complete row per phone
   (most non-empty fields wins).
5. Write surviving rows to unique_leads.csv using File 2's column schema.
"""

import csv
import re
import sys
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
BASE = Path(r"C:\Users\Bah\Desktop\website\webscale")
FILE1 = BASE / "Marketing days masterclass - Sheet1 (1).csv"
FILE2 = BASE / "leads-1128bdb2-c479-4c32-b971-2999065297da (1).csv"
OUT   = BASE / "unique_leads.csv"

# ── Output columns (File 2 schema) ────────────────────────────────────────────
OUT_COLS = [
    "Name", "Phone", "Wilaya", "Commune", "Status", "Source", "Campaign",
    "Date", "bestTime", "company", "decisionMaker", "email", "employees",
    "expectation", "role", "sector", "webscaleMember", "why", "altPhone",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize_phone(raw: str) -> str:
    """Strip non-digits, return last 9 digits (or '' if fewer than 9 digits)."""
    digits = re.sub(r"\D", "", raw or "")
    return digits[-9:] if len(digits) >= 9 else digits


def completeness(row: dict) -> int:
    """Count non-empty fields — used to pick the best row per phone."""
    return sum(1 for v in row.values() if v and v.strip())


def read_csv(path: Path, encoding: str = "utf-8-sig") -> list[dict]:
    """Read a CSV and return a list of dicts."""
    with open(path, encoding=encoding, errors="replace", newline="") as fh:
        return list(csv.DictReader(fh))


def best_per_phone(rows: list[dict], phone_field: str) -> dict[str, dict]:
    """
    Given a list of row dicts, return {canonical_phone: best_row}
    where 'best' means highest completeness score.
    Rows with no valid phone key are silently dropped.
    """
    groups: dict[str, list[dict]] = {}
    for row in rows:
        key = normalize_phone(row.get(phone_field, ""))
        if not key:
            continue
        groups.setdefault(key, []).append(row)

    return {
        key: max(group, key=completeness)
        for key, group in groups.items()
    }


# ── File 1 → Output row mapper ────────────────────────────────────────────────
# File 1 headers (observed):
#   '', 'Téléphone', 'Wilaya', 'Assigned to', 'Date', 'bestTime',
#   'company', 'role', 'sector', 'email', 'decisionMaker', 'employees',
#   'expectation', 'source', 'webscaleMember', 'why', 'Statut', 'Note', ''

def map_file1_row(row: dict) -> dict:
    """Map a File 1 row dict to the output column schema."""
    # The first column (empty header '') holds the Name
    name = row.get("", "").strip()
    # Fallback: some exports use a BOM-stripped empty key or a named key
    if not name:
        # Try the first value in the dict regardless of key
        first_val = next(iter(row.values()), "")
        name = first_val.strip()

    return {
        "Name":          name,
        "Phone":         row.get("Téléphone", row.get("T�l�phone", row.get("Telephone", ""))).strip(),
        "Wilaya":        row.get("Wilaya", "").strip(),
        "Commune":       "",                          # not in File 1
        "Status":        row.get("Statut", "").strip(),
        "Source":        row.get("source", "").strip(),
        "Campaign":      "",                          # not in File 1
        "Date":          row.get("Date", "").strip(),
        "bestTime":      row.get("bestTime", "").strip(),
        "company":       row.get("company", "").strip(),
        "decisionMaker": row.get("decisionMaker", "").strip(),
        "email":         row.get("email", "").strip(),
        "employees":     row.get("employees", "").strip(),
        "expectation":   row.get("expectation", "").strip(),
        "role":          row.get("role", "").strip(),
        "sector":        row.get("sector", "").strip(),
        "webscaleMember":row.get("webscaleMember", "").strip(),
        "why":           row.get("why", "").strip(),
        "altPhone":      "",                          # not in File 1
    }


def map_file2_row(row: dict) -> dict:
    """Map a File 2 row dict to the output column schema (drop extra cols)."""
    return {col: row.get(col, "").strip() for col in OUT_COLS}


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    # 1. Read raw rows
    rows1_raw = read_csv(FILE1)
    rows2_raw = read_csv(FILE2)

    # Detect the phone-field name in File 1 (handle encoding issues)
    phone_field1 = "Téléphone"
    for key in (rows1_raw[0].keys() if rows1_raw else []):
        if "l" in key.lower() and "phone" in key.lower().replace("é","e").replace("è","e"):
            phone_field1 = key
            break
        # also catch garbled versions like 'T\x...'
        if key.lower().startswith("t") and "phone" in key.lower():
            phone_field1 = key
            break

    # 2. Collapse within-file duplicates → best row per canonical phone
    best1 = best_per_phone(rows1_raw, phone_field1)   # {key: raw_row}
    best2 = best_per_phone(rows2_raw, "Phone")         # {key: raw_row}

    # 3. Find cross-file overlap
    keys1 = set(best1.keys())
    keys2 = set(best2.keys())
    overlap = keys1 & keys2

    unique_keys1 = keys1 - overlap   # only in File 1
    unique_keys2 = keys2 - overlap   # only in File 2

    # 4. Map rows to output schema
    out_rows: list[dict] = []

    for key in sorted(unique_keys1):
        out_rows.append(map_file1_row(best1[key]))

    for key in sorted(unique_keys2):
        out_rows.append(map_file2_row(best2[key]))

    # 5. Write output
    with open(OUT, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=OUT_COLS)
        writer.writeheader()
        writer.writerows(out_rows)

    # 6. Summary
    print("=" * 55)
    print("  Deduplication summary")
    print("=" * 55)
    print(f"  File 1 total unique phones   : {len(keys1):>6}")
    print(f"  File 2 total unique phones   : {len(keys2):>6}")
    print(f"  Cross-file duplicates removed: {len(overlap):>6}")
    print(f"  Unique entries from File 1   : {len(unique_keys1):>6}")
    print(f"  Unique entries from File 2   : {len(unique_keys2):>6}")
    print(f"  Total rows written           : {len(out_rows):>6}")
    print(f"  Output file                  : {OUT}")
    print("=" * 55)


if __name__ == "__main__":
    main()
