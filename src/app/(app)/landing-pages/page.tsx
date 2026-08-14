import { PageHeader } from "@/components/primitives/page-header";
import { listLandingPages } from "./actions";
import { listLandingPagesSchema } from "@/lib/schemas/landing-page";
import { LandingPagesToolbar } from "./landing-pages-toolbar";
import { LandingPagesTable } from "./landing-pages-table";

export const metadata = { title: "Landing pages" };

export default async function LandingPagesPage({
  searchParams,
}: PageProps<"/landing-pages">) {
  const params = await searchParams;
  const parsed = listLandingPagesSchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
    pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
    sortBy: typeof params.sortBy === "string" ? params.sortBy : undefined,
    sortDir: typeof params.sortDir === "string" ? params.sortDir : undefined,
  });

  const { rows, total } = await listLandingPages(parsed);

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Landing pages"
        description="Course-specific pages you can publish in minutes. No code required."
      />
      <div className="flex-1 space-y-4 p-6">
        <LandingPagesToolbar total={total} />
        <LandingPagesTable rows={rows} total={total} />
      </div>
    </>
  );
}
