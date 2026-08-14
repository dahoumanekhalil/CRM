import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/primitives/page-header";
import { NewLandingPagePicker } from "./new-picker";

export const metadata = { title: "New landing page" };

export default async function NewLandingPagePage() {
  const courses = await prisma.course.findMany({
    where: { status: { in: ["DRAFT", "PUBLISHED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, category: true, status: true },
  });

  return (
    <>
      <PageHeader
        eyebrow="Marketing / Landing pages"
        title="Create a landing page"
        description="Pick a course and a starting template. You can customize everything after."
      />
      <div className="flex-1 p-6">
        <NewLandingPagePicker courses={courses} />
      </div>
    </>
  );
}
