"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

import {
  createTaskSchema,
  updateTaskSchema,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/lib/schemas/task";
import { createTask, updateTask } from "./actions";
import type { TaskRow, UserPickerItem } from "./actions";

const humanize = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "text-destructive",
  HIGH: "text-amber-500",
  NORMAL: "text-foreground",
  LOW: "text-muted-foreground",
};

interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow;
  users: UserPickerItem[];
  defaultEntityType?: string;
  defaultEntityId?: string;
  defaultEntityLabel?: string;
}

export function TaskSheet({
  open,
  onOpenChange,
  task,
  users,
  defaultEntityType,
  defaultEntityId,
  defaultEntityLabel,
}: TaskSheetProps) {
  const router = useRouter();
  const isEdit = !!task;

  const schema = isEdit ? updateTaskSchema : createTaskSchema;

  const defaultValues = isEdit
    ? {
        id: task.id,
        title: task.title,
        description: task.description ?? "",
        ownerId: task.owner?.id ?? "",
        priority: task.priority,
        status: task.status,
        dueDate: toDatetimeLocal(task.dueDate),
      }
    : {
        title: "",
        description: "",
        ownerId: "",
        priority: "NORMAL" as const,
        status: "TODO" as const,
        dueDate: "",
        entityType: defaultEntityType ?? "",
        entityId: defaultEntityId ?? "",
      };

  const form = useForm<CreateTaskInput | UpdateTaskInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [pending, startTransition] = React.useTransition();

  const onSubmit = (values: CreateTaskInput | UpdateTaskInput) => {
    startTransition(async () => {
      const res = isEdit
        ? await updateTask(values as UpdateTaskInput)
        : await createTask(values as CreateTaskInput);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Task updated" : "Task created");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the task details below."
              : "Create a task to track an action item or follow-up."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="task-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto px-4 space-y-5 pb-4"
          >
            {/* Entity context badge (read-only) */}
            {(defaultEntityLabel ?? task?.entityType) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Linked to</span>
                <Badge variant="secondary" className="text-xs">
                  {defaultEntityLabel ??
                    `${task?.entityType} ${task?.entityId?.slice(0, 8)}`}
                </Badge>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Follow up with Sara"
                      autoFocus
                      {...field}
                      value={field.value as string}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Any additional context…"
                      {...field}
                      value={(field.value as string) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={field.value as string}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            <span className={PRIORITY_COLORS[p]}>
                              {humanize(p)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value as string}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {humanize(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={(field.value as string) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned to</FormLabel>
                  <Select
                    value={(field.value as string) ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <SheetFooter className="border-t border-border/70">
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" form="task-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create task"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
