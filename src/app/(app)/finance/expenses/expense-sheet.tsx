"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import type { z } from "zod";

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
import { FormSection, FormSectionDivider } from "@/components/primitives/form-section";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUSES,
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "@/lib/schemas/expense";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_CURRENCIES,
} from "@/lib/schemas/payment";
import {
  createExpense,
  updateExpense,
  listCoursesForExpensePicker,
  listSessionsForExpensePicker,
  type ExpenseRow,
} from "./actions";

type CreateInput = z.input<typeof createExpenseSchema>;

interface CommonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
interface CreateProps extends CommonProps {
  mode: "create";
  expense?: undefined;
}
interface EditProps extends CommonProps {
  mode: "edit";
  expense: ExpenseRow;
}
type Props = CreateProps | EditProps;

type CoursePickerItem = { id: string; name: string; slug: string };
type SessionPickerItem = { id: string; title: string | null; startDate: Date };

function currentDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function ExpenseSheet({ open, onOpenChange, ...props }: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const expense = isEdit ? props.expense : undefined;

  const schema = isEdit ? updateExpenseSchema : createExpenseSchema;

  const form = useForm<CreateInput>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          title: expense.title,
          description: expense.description ?? "",
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category as CreateInput["category"],
          expenseDate: expense.expenseDate
            ? format(new Date(expense.expenseDate), "yyyy-MM-dd")
            : currentDate(),
          paymentMethod: expense.paymentMethod as CreateInput["paymentMethod"],
          courseId: expense.courseId ?? undefined,
          sessionId: expense.sessionId ?? undefined,
          reference: expense.reference ?? "",
          notes: expense.notes ?? "",
          status: expense.status as CreateInput["status"],
        }
      : {
          title: "",
          description: "",
          amount: undefined as unknown as number,
          currency: "DZD",
          category: undefined,
          expenseDate: currentDate(),
          paymentMethod: "CASH",
          courseId: undefined,
          sessionId: undefined,
          reference: "",
          notes: "",
          status: "CONFIRMED",
        },
  });

  const [courses, setCourses] = React.useState<CoursePickerItem[]>([]);
  const [sessions, setSessions] = React.useState<SessionPickerItem[]>([]);
  const selectedCourseId = form.watch("courseId");

  React.useEffect(() => {
    if (open) {
      listCoursesForExpensePicker().then(setCourses).catch(() => {});
    }
  }, [open]);

  React.useEffect(() => {
    if (selectedCourseId) {
      listSessionsForExpensePicker(selectedCourseId)
        .then(setSessions)
        .catch(() => {});
    } else {
      setSessions([]);
    }
  }, [selectedCourseId]);

  async function onSubmit(values: CreateInput) {
    let result;
    if (isEdit && expense) {
      result = await updateExpense({ ...(values as unknown as UpdateExpenseInput), id: expense.id });
    } else {
      result = await createExpense(values as unknown as CreateExpenseInput);
    }

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Expense updated" : "Expense recorded");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-6 pb-4 pt-6 border-b">
          <SheetTitle>{isEdit ? "Edit expense" : "Record expense"}</SheetTitle>
          <SheetDescription className="sr-only">
            {isEdit ? "Update expense details." : "Record a new expense."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col"
          >
            <div className="flex-1 space-y-0 overflow-y-auto">
              <FormSection
                title="Details"
                description="What was this expense for?"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Hall cleaning fee" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {EXPENSE_CATEGORY_LABELS[c]}
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
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EXPENSE_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.charAt(0) + s.slice(1).toLowerCase()}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Additional notes…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSectionDivider />

              <FormSection title="Amount">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.01"
                            step="100"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment method</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {PAYMENT_METHOD_LABELS[m]}
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
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Receipt or transaction ref…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSectionDivider />

              <FormSection
                title="Link to course"
                description="Optionally associate this expense with a course run for financial reporting."
              >
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course (optional)</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => {
                          field.onChange(v || undefined);
                          form.setValue("sessionId", undefined);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No course</SelectItem>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedCourseId && sessions.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="sessionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course run (optional)</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v || undefined)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No course run" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No course run</SelectItem>
                            {sessions.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.title ?? format(new Date(s.startDate), "MMM d, yyyy")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </FormSection>

              <FormSectionDivider />

              <FormSection title="Notes">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Any additional details…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>
            </div>

            <SheetFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? isEdit
                    ? "Saving…"
                    : "Recording…"
                  : isEdit
                    ? "Save changes"
                    : "Record expense"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
