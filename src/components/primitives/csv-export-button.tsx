"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CsvExportButtonProps {
  // Server action that returns { ok, csv, filename } | { ok: false, error }
  onExport: () => Promise<
    | { ok: true; csv: string; filename: string }
    | { ok: false; error: string }
  >;
  label?: string;
}

// Triggers a server action then downloads the result as a .csv file using a
// Blob URL — no round-trip to a download endpoint needed.
export function CsvExportButton({ onExport, label = "Export" }: CsvExportButtonProps) {
  const [pending, startTransition] = React.useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const res = await onExport();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Build a temporary link to trigger the browser download.
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${res.filename}`);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Download />
      )}
      {label}
    </Button>
  );
}
