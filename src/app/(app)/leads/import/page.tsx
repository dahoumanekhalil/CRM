import { PageHeader } from "@/components/primitives/page-header";
import { getCoursesForImport } from "./actions";
import { ImportClient } from "./import-client";

export default async function ImportLeadsPage() {
  const courses = await getCoursesForImport();

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <PageHeader
        eyebrow="Leads"
        title="Import from CSV"
        description="Upload a spreadsheet to bulk-create leads in seconds. We'll auto-detect your columns."
      />
      <ImportClient courses={courses} />
    </div>
  );
}
