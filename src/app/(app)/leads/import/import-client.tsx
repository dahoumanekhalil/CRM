"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  RefreshCw,
  SkipForward,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { importLeads, type ImportLeadRow, type ImportResult } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadField =
  | "skip"
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "notes"
  | "source"
  | "tags";

type Step = "upload" | "map" | "confirm" | "done";

const FIELD_OPTIONS: { value: LeadField; label: string; required?: boolean }[] = [
  { value: "skip", label: "Skip column" },
  { value: "firstName", label: "First Name", required: true },
  { value: "lastName", label: "Last Name" },
  { value: "fullName", label: "Full Name (auto-split)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags (comma-separated)" },
];

// ── CSV Parser ────────────────────────────────────────────────────────────────

function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  if (tabs >= commas && tabs >= semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function parseCSV(text: string): string[][] {
  const content = text.replace(/^﻿/, ""); // strip BOM
  const firstLine = content.split(/\r?\n/)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i += 2; }
      else if (ch === '"') { inQuotes = false; i++; }
      else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === delimiter) { row.push(field.trim()); field = ""; i++; }
      else if (ch === "\r" && next === "\n") {
        row.push(field.trim()); rows.push(row); row = []; field = ""; i += 2;
      } else if (ch === "\r" || ch === "\n") {
        row.push(field.trim()); rows.push(row); row = []; field = ""; i++;
      } else { field += ch; i++; }
    }
  }
  if (field || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// ── Auto-column detector ──────────────────────────────────────────────────────

function autoDetect(headers: string[]): LeadField[] {
  return headers.map((h): LeadField => {
    const n = h.toLowerCase().trim();
    if (/^(first.?name|prénom|prenom|الاسم.الأول)$/.test(n)) return "firstName";
    if (/^(last.?name|nom|اللقب|family.?name)$/.test(n)) return "lastName";
    if (/^(full.?name|name|الاسم|nom.complet|client|customer|contact)$/.test(n)) return "fullName";
    if (/email|e-mail|mail|البريد/.test(n)) return "email";
    if (/phone|tel|mobile|gsm|هاتف|numéro|numero|cel/.test(n)) return "phone";
    if (/note|remark|comment|ملاحظ/.test(n)) return "notes";
    if (/^(source|from|channel|origine)$/.test(n)) return "source";
    if (/tag|label|categ/.test(n)) return "tags";
    return "skip";
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function splitFullName(full: string): { firstName: string; lastName?: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function buildRows(
  dataRows: string[][],
  headers: string[],
  mapping: LeadField[]
): ImportLeadRow[] {
  return dataRows.map((row) => {
    const lead: ImportLeadRow = { firstName: "" };
    mapping.forEach((field, colIdx) => {
      const cell = row[colIdx] ?? "";
      if (!cell || field === "skip") return;
      if (field === "fullName") {
        const { firstName, lastName } = splitFullName(cell);
        lead.firstName = lead.firstName || firstName;
        if (lastName) lead.lastName = lead.lastName || lastName;
      } else if (field === "firstName") lead.firstName = lead.firstName || cell;
      else if (field === "lastName") lead.lastName = lead.lastName || cell;
      else if (field === "email") lead.email = cell;
      else if (field === "phone") lead.phone = cell;
      else if (field === "notes") lead.notes = cell;
      else if (field === "source") lead.source = cell;
      else if (field === "tags") lead.tags = cell.split(",").map((t) => t.trim()).filter(Boolean);
    });
    return lead;
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map columns" },
  { id: "confirm", label: "Import" },
] as const;

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = currentIdx > i || current === "done";
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  active && !done && "border-2 border-primary text-primary",
                  !active && !done && "border border-border/60 text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-px w-8 transition-colors",
                  currentIdx > i ? "bg-primary" : "bg-border/40"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Step 1: Upload ────────────────────────────────────────────────────────────

function UploadStep({
  onParsed,
}: {
  onParsed: (fileName: string, headers: string[], rows: string[][]) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setError("Please upload a .csv or .tsv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const all = parseCSV(text);
        if (all.length < 2) { setError("File appears to be empty or has only one row."); return; }
        const [headers, ...rows] = all;
        onParsed(file.name, headers, rows);
      } catch {
        setError("Failed to parse file. Please check the format and try again.");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-14 text-center transition-all",
          dragging
            ? "border-primary/60 bg-primary/5"
            : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl transition-colors",
            dragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <FileUp className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {dragging ? "Drop your file here" : "Drop your CSV file here"}
          </p>
          <p className="text-xs text-muted-foreground">
            or <span className="text-primary underline-offset-2 hover:underline">browse files</span>
            {" · "}Supports .csv and .tsv files
          </p>
        </div>
        {dragging && (
          <div className="absolute inset-0 rounded-xl bg-primary/5 ring-2 ring-primary/30 ring-offset-0" />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Google Sheets tip */}
      <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium">Exporting from Google Sheets</p>
          <p className="text-xs text-muted-foreground">
            File → Download → Comma-separated values (.csv)
          </p>
        </div>
      </div>

      {/* Sample download hint */}
      <div className="flex items-center gap-2">
        <a
          href="data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Notes%0AAhmed,Hassan,ahmed@example.com,+213555000001,Interested in marketing course%0ASara,Benali,sara@example.com,+213555000002,%0AKarim,Moussa,,+213555000003,Called twice"
          download="import-template.csv"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="size-3" />
          Download example template
        </a>
      </div>
    </div>
  );
}

// ── Step 2: Map columns ───────────────────────────────────────────────────────

function MapStep({
  fileName,
  headers,
  rows,
  mapping,
  setMapping,
  onNext,
  onBack,
}: {
  fileName: string;
  headers: string[];
  rows: string[][];
  mapping: LeadField[];
  setMapping: (m: LeadField[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = mapping.some((f) => f === "firstName" || f === "fullName");
  const previewRows = rows.slice(0, 4);

  const mappedCols = mapping
    .map((f, i) => ({ field: f, colIdx: i }))
    .filter((m) => m.field !== "skip");

  function setCol(idx: number, val: LeadField) {
    const next = [...mapping];
    next[idx] = val;
    setMapping(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {rows.length.toLocaleString()} rows · {headers.length} columns detected
          </p>
        </div>
        {!canContinue && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-3.5" />
            Map at least one name column to continue
          </div>
        )}
      </div>

      {/* Mapping table */}
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-border/40 text-xs font-medium text-muted-foreground">
          <div className="bg-muted/50 px-4 py-2.5">Your column</div>
          <div className="bg-muted/50 px-4 py-2.5">Maps to</div>
        </div>
        {headers.map((header, i) => (
          <div key={i} className="grid grid-cols-2 gap-px bg-border/20">
            <div className="flex items-center gap-2 bg-card px-4 py-2.5">
              <span className="text-sm truncate">{header}</span>
              {mapping[i] === "skip" && (
                <SkipForward className="size-3.5 shrink-0 text-muted-foreground/50" />
              )}
            </div>
            <div className="bg-card px-3 py-2">
              <Select
                value={mapping[i] ?? "skip"}
                onValueChange={(v) => setCol(i, v as LeadField)}
              >
                <SelectTrigger className="h-8 border-0 bg-transparent px-1 text-sm shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      {previewRows.length > 0 && mappedCols.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Preview — first {previewRows.length} rows
          </p>
          <div className="rounded-xl border border-border/60 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  {mappedCols.map(({ field, colIdx }) => (
                    <th key={colIdx} className="px-3 py-2 text-start font-medium text-muted-foreground">
                      {FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className={cn(ri > 0 && "border-t border-border/30")}>
                    {mappedCols.map(({ colIdx }) => (
                      <td key={colIdx} className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                        {row[colIdx] || <span className="opacity-30">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button size="sm" onClick={onNext} disabled={!canContinue}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Confirm & import ──────────────────────────────────────────────────

function ConfirmStep({
  headers,
  rows,
  mapping,
  courses,
  onBack,
  onDone,
}: {
  headers: string[];
  rows: string[][];
  mapping: LeadField[];
  courses: { id: string; name: string }[];
  onBack: () => void;
  onDone: (result: ImportResult) => void;
}) {
  const [courseId, setCourseId] = React.useState("");
  const [source, setSource] = React.useState("CSV Import");
  const [status, setStatus] = React.useState<"NEW" | "CONTACTED" | "INTERESTED">("NEW");
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const builtRows = React.useMemo(
    () => buildRows(rows, headers, mapping),
    [rows, headers, mapping]
  );
  const validRows = builtRows.filter((r) => r.firstName.trim());
  const invalidCount = builtRows.length - validRows.length;

  async function handleImport() {
    setImporting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 85));
    }, 200);

    const res = await importLeads(validRows, {
      courseId: courseId || undefined,
      source: source.trim() || undefined,
      status,
    });

    clearInterval(interval);
    setProgress(100);

    if (!res.ok) {
      toast.error(res.error);
      setImporting(false);
      setProgress(0);
      return;
    }
    onDone(res.data);
  }

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-xl border border-border/60 bg-muted/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{validRows.length.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              leads ready to import
              {invalidCount > 0 && (
                <span className="ms-2 text-amber-600 dark:text-amber-400">
                  · {invalidCount} rows skipped (no name)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Associate with course (optional)</Label>
          <Select value={courseId || "__none"} onValueChange={(v) => setCourseId(v === "__none" ? "" : v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="None — import without course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Imported leads will appear in the selected course's lead list.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Source label</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Google Sheets, WhatsApp, Event"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Default status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="INTERESTED">Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Progress bar */}
      {importing && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              Importing…
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={importing}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={importing || validRows.length === 0}
          className="min-w-[160px]"
        >
          {importing ? (
            <><Loader2 className="size-4 animate-spin" /> Importing…</>
          ) : (
            <>Import {validRows.length.toLocaleString()} leads <ArrowRight className="size-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────

function DoneStep({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="size-8" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Import complete</h2>
        <p className="text-sm text-muted-foreground">Your leads are now in the system.</p>
      </div>

      {/* Stats row */}
      <div className="flex items-start justify-center gap-8">
        <div className="space-y-0.5">
          <p className="text-3xl font-bold tabular-nums text-primary">{result.created}</p>
          <p className="text-xs text-muted-foreground">created</p>
        </div>
        {result.skipped > 0 && (
          <div className="space-y-0.5">
            <p className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{result.skipped}</p>
            <p className="text-xs text-muted-foreground">skipped (duplicates)</p>
          </div>
        )}
        {result.errors > 0 && (
          <div className="space-y-0.5">
            <p className="text-3xl font-bold tabular-nums text-destructive">{result.errors}</p>
            <p className="text-xs text-muted-foreground">invalid rows</p>
          </div>
        )}
      </div>

      {result.skipped > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="size-3.5 shrink-0" />
          {result.skipped} lead{result.skipped !== 1 ? "s" : ""} were already in your system and were not duplicated.
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href="/leads">View all leads</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="size-4" /> Import another file
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function ImportClient({
  courses,
}: {
  courses: { id: string; name: string }[];
}) {
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<LeadField[]>([]);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  function handleParsed(name: string, h: string[], r: string[][]) {
    setFileName(name);
    setHeaders(h);
    setRows(r);
    setMapping(autoDetect(h));
    setStep("map");
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping([]);
    setResult(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {step !== "done" && (
        <div className="flex items-center gap-3">
          <StepIndicator current={step} />
        </div>
      )}

      <div
        className={cn(
          "rounded-xl border border-border/60 bg-card p-6 shadow-sm",
          step === "done" && "border-primary/20 bg-primary/[0.02]"
        )}
      >
        {step === "upload" && <UploadStep onParsed={handleParsed} />}
        {step === "map" && (
          <MapStep
            fileName={fileName}
            headers={headers}
            rows={rows}
            mapping={mapping}
            setMapping={setMapping}
            onNext={() => setStep("confirm")}
            onBack={reset}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            headers={headers}
            rows={rows}
            mapping={mapping}
            courses={courses}
            onBack={() => setStep("map")}
            onDone={(r) => { setResult(r); setStep("done"); }}
          />
        )}
        {step === "done" && result && (
          <DoneStep result={result} onReset={reset} />
        )}
      </div>
    </div>
  );
}
