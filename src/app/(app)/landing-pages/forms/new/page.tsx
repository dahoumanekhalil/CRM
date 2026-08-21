import { PageHeader } from "@/components/primitives/page-header";
import { NewFormClient } from "./new-form-client";

export const metadata = { title: "New form" };

export default function NewFormPage() {
  return (
    <>
      <PageHeader
        eyebrow="Forms"
        title="Create a form"
        description="Name your form. You'll add fields in the next step."
      />
      <div className="flex-1 p-6">
        <NewFormClient />
      </div>
    </>
  );
}
