import Link from "next/link";
import { Plus, FileInput, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/primitives/page-header";
import { Button } from "@/components/ui/button";
import { listForms } from "./actions";
import { FormsTable } from "./forms-table";

export const metadata = { title: "Forms" };

export default async function FormsPage() {
  const forms = await listForms();

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Forms"
        description="Build reusable forms, embed them anywhere, and collect submissions in your CRM."
        actions={
          <Button asChild>
            <Link href="/landing-pages/forms/new">
              <Plus className="size-4" />
              New form
            </Link>
          </Button>
        }
      />
      <div className="flex-1 space-y-4 p-6">
        {forms.length === 0 ? (
          <EmptyState />
        ) : (
          <FormsTable forms={forms} />
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 py-20 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-xl border border-border/70 bg-background shadow-sm">
        <FileInput className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">No forms yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create a form, link it to landing pages, and collect submissions from
        your website or external sites.
      </p>
      <Button asChild className="mt-6">
        <Link href="/landing-pages/forms/new">
          <Plus className="size-4" />
          Create your first form
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
