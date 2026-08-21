"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Copy, Check, Code2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormField, FormSettings } from "@/lib/forms/types";

type FormWithSubs = {
  id: string;
  name: string;
  description: string | null;
  fields: unknown;
  settings: unknown;
  _count: { submissions: number };
  submissions: Array<{
    id: string;
    data: unknown;
    metadata: unknown;
    createdAt: Date;
  }>;
};

export function FormDetailClient({ form }: { form: FormWithSubs }) {
  const fields = Array.isArray(form.fields) ? (form.fields as FormField[]) : [];
  const settings = (form.settings ?? {}) as FormSettings;
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://yoursite.com";
  const endpoint = `${baseUrl}/api/forms/${form.id}/submit`;

  return (
    <Tabs defaultValue="submissions">
      <TabsList>
        <TabsTrigger value="submissions">
          Submissions ({form._count.submissions})
        </TabsTrigger>
        <TabsTrigger value="api">API & Embed</TabsTrigger>
      </TabsList>

      <TabsContent value="submissions" className="mt-4">
        {form.submissions.length === 0 ? (
          <SubmissionsEmpty />
        ) : (
          <SubmissionsTable
            submissions={form.submissions}
            fields={fields}
          />
        )}
      </TabsContent>

      <TabsContent value="api" className="mt-4">
        <ApiPanel
          formId={form.id}
          endpoint={endpoint}
          fields={fields}
          settings={settings}
        />
      </TabsContent>
    </Tabs>
  );
}

function SubmissionsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 py-16 text-center">
      <Inbox className="mb-3 size-8 text-muted-foreground/50" />
      <h3 className="text-sm font-semibold">No submissions yet</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Submissions will appear here once someone fills out this form.
      </p>
    </div>
  );
}

function SubmissionsTable({
  submissions,
  fields,
}: {
  submissions: Array<{ id: string; data: unknown; createdAt: Date }>;
  fields: FormField[];
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {fields.map((f) => (
              <TableHead key={f.id}>{f.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((sub) => {
            const data = (sub.data ?? {}) as Record<string, string>;
            return (
              <TableRow key={sub.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {format(new Date(sub.createdAt), "dd MMM yyyy HH:mm")}
                </TableCell>
                {fields.map((f) => (
                  <TableCell key={f.id} className="max-w-[200px] truncate text-sm">
                    {data[f.id] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ApiPanel({
  formId,
  endpoint,
  fields,
  settings,
}: {
  formId: string;
  endpoint: string;
  fields: FormField[];
  settings: FormSettings;
}) {
  const [copied, setCopied] = React.useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const exampleBody = Object.fromEntries(
    fields.map((f) => [
      f.id,
      f.type === "checkbox" ? false : f.type === "number" ? 0 : `example ${f.label}`,
    ])
  );

  const iframeSrc = `${endpoint.replace("/api/forms/", "/embed/forms/").replace("/submit", "")}`;

  const iframeCode = `<iframe
  src="${iframeSrc}"
  width="100%"
  height="500"
  frameborder="0"
  style="border:none; border-radius:12px;"
  title="${settings.heading ?? "Form"}"
></iframe>`;

  const curlExample = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(exampleBody, null, 2)}'`;

  return (
    <div className="space-y-6">
      {/* Endpoint */}
      <Section title="API endpoint" icon={<Code2 className="size-4" />}>
        <p className="mb-3 text-sm text-muted-foreground">
          Send a <code className="rounded bg-muted px-1 py-0.5 text-xs">POST</code> request
          to this URL from any website or server. CORS is enabled for all origins.
        </p>
        <CodeBlock
          code={endpoint}
          onCopy={() => copy(endpoint, "endpoint")}
          copied={copied === "endpoint"}
        />
      </Section>

      {/* Field schema */}
      {fields.length > 0 ? (
        <Section title="Request body (JSON)">
          <p className="mb-3 text-sm text-muted-foreground">
            Send field values as JSON. Required fields are marked with *.
          </p>
          <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/30 p-4">
            {fields.map((f) => (
              <div key={f.id} className="flex items-start gap-3 text-sm">
                <code className="shrink-0 rounded bg-background px-1.5 py-0.5 text-xs font-mono border border-border/50">
                  {f.id}
                </code>
                <span className="text-muted-foreground">
                  {f.label}
                  {f.required ? (
                    <span className="ms-1 text-destructive">*</span>
                  ) : null}
                  <span className="ms-2 text-xs opacity-60">({f.type})</span>
                  {f.options && f.options.length > 0 ? (
                    <span className="ms-2 text-xs opacity-60">
                      options: {f.options.join(", ")}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <CodeBlock
              code={curlExample}
              label="Example curl"
              onCopy={() => copy(curlExample, "curl")}
              copied={copied === "curl"}
            />
          </div>
        </Section>
      ) : null}

      {/* iframe embed */}
      <Section title="Iframe embed">
        <p className="mb-3 text-sm text-muted-foreground">
          Embed this form on any external website using an iframe.
        </p>
        <CodeBlock
          code={iframeCode}
          onCopy={() => copy(iframeCode, "iframe")}
          copied={copied === "iframe"}
        />
      </Section>

      {/* Response */}
      <Section title="Response">
        <p className="mb-3 text-sm text-muted-foreground">
          Successful submissions return <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{ ok: true }"}</code>.
          Validation errors return <code className="rounded bg-muted px-1 py-0.5 text-xs">{"{ ok: false, error: '...' }"}</code> with status 422.
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CodeBlock({
  code,
  label,
  onCopy,
  copied,
}: {
  code: string;
  label?: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="relative rounded-lg border border-border/70 bg-muted/40">
      {label ? (
        <div className="border-b border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute end-2 top-2 size-7"
        onClick={onCopy}
        title="Copy"
      >
        {copied ? (
          <Check className="size-3.5 text-green-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
