"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteForm } from "./actions";
import type { FormField } from "@/lib/forms/types";

type FormRow = {
  id: string;
  name: string;
  description: string | null;
  fields: unknown;
  createdAt: Date;
  _count: { submissions: number };
};

export function FormsTable({ forms }: { forms: FormRow[] }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Submissions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((form) => (
            <FormRow key={form.id} form={form} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FormRow({ form }: { form: FormRow }) {
  const [deleting, setDeleting] = React.useState(false);
  const fields = Array.isArray(form.fields)
    ? (form.fields as FormField[])
    : [];

  async function handleDelete() {
    if (!confirm(`Delete "${form.name}"? All submissions will be lost.`)) return;
    setDeleting(true);
    try {
      await deleteForm(form.id);
      toast.success("Form deleted");
    } catch {
      toast.error("Failed to delete form");
      setDeleting(false);
    }
  }

  return (
    <TableRow className="group">
      <TableCell>
        <div>
          <Link
            href={`/landing-pages/forms/${form.id}`}
            className="font-medium hover:underline"
          >
            {form.name}
          </Link>
          {form.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {form.description}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {fields.length} {fields.length === 1 ? "field" : "fields"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {form._count.submissions.toLocaleString()}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 opacity-0 group-hover:opacity-100"
              disabled={deleting}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/landing-pages/forms/${form.id}/edit`}>
                <Pencil className="size-3.5" />
                Edit form
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/landing-pages/forms/${form.id}`}>
                <ExternalLink className="size-3.5" />
                View submissions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
