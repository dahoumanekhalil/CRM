import { PageHeader } from "@/components/primitives/page-header";
import { Forbidden } from "@/components/primitives/forbidden";
import { requirePermissionPage } from "@/lib/auth-guards";
import { listTasksSchema } from "@/lib/schemas/task";
import { listTasks, listUsersForPicker } from "./actions";
import { TasksClient } from "./tasks-client";

export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: PageProps<"/tasks">) {
  const { allowed } = await requirePermissionPage("tasks.view");
  if (!allowed) return <Forbidden />;

  const params = await searchParams;
  const parsed = listTasksSchema.parse({
    q: typeof params.q === "string" ? params.q : undefined,
    preset: typeof params.preset === "string" ? params.preset : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    priority: typeof params.priority === "string" ? params.priority : undefined,
    page: typeof params.page === "string" ? params.page : undefined,
    pageSize: typeof params.pageSize === "string" ? params.pageSize : undefined,
  });

  const [{ rows, total }, users] = await Promise.all([
    listTasks(parsed),
    listUsersForPicker(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Productivity"
        title="Tasks"
        description="Track follow-ups, reminders, and actions across the team."
      />
      <div className="flex-1 space-y-4 p-6">
        <TasksClient rows={rows} total={total} users={users} />
      </div>
    </>
  );
}
