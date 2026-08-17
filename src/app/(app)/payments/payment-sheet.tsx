"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FormSection,
  FormSectionDivider,
} from "@/components/primitives/form-section";

import {
  createPaymentSchema,
  updatePaymentSchema,
  PAYMENT_CURRENCIES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_REFERENCE_LABEL,
  PAYMENT_STATUSES,
  type CreatePaymentInput,
  type UpdatePaymentInput,
} from "@/lib/schemas/payment";
import {
  createPayment,
  updatePayment,
  listRegistrationsForStudentPicker,
  type PaymentRegistrationPickerItem,
  type PaymentStudentPickerItem,
  type PaymentRow,
  type StudentPaymentRow,
} from "./actions";


const humanizeStatus = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

type CreateFormInput = z.input<typeof createPaymentSchema>;
type FormInput = CreateFormInput & { id?: string };

type EditablePayment = PaymentRow | StudentPaymentRow;

interface CommonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: PaymentStudentPickerItem[];
  // If provided, the student selector is hidden and locked.
  lockedStudentId?: string;
  lockedStudentName?: string;
}

interface CreateProps extends CommonProps {
  mode: "create";
  payment?: undefined;
  // Optional preseed for the registration when creating from a specific context.
  presetRegistrationId?: string;
}

interface EditProps extends CommonProps {
  mode: "edit";
  payment: EditablePayment;
}

const currentDatetimeLocal = (): string => {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isoDatetimeLocal = (d: Date | null | undefined): string => {
  if (!d) return "";
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function PaymentSheet(props: CreateProps | EditProps) {
  const { open, onOpenChange, mode, students, lockedStudentId, lockedStudentName } =
    props;
  const router = useRouter();

  const defaults = React.useMemo<FormInput>(() => {
    if (mode === "edit") {
      const p = props.payment;
      return {
        id: p.id,
        studentId: p.studentId,
        registrationId: p.registrationId ?? undefined,
        amount: p.amount,
        currency: p.currency as CreateFormInput["currency"],
        method: p.method,
        status: p.status,
        reference: p.reference ?? "",
        notes: p.notes ?? "",
        paidAt: isoDatetimeLocal(p.paidAt),
      };
    }
    return {
      studentId: lockedStudentId ?? "",
      registrationId: props.presetRegistrationId,
      amount: undefined as unknown as number,
      currency: "DZD",
      method: "CASH",
      status: "COMPLETED",
      reference: "",
      notes: "",
      paidAt: currentDatetimeLocal(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mode === "edit" ? props.payment?.id : lockedStudentId ?? ""]);

  const form = useForm<FormInput>({
    resolver: zodResolver(
      mode === "edit" ? updatePaymentSchema : createPaymentSchema
    ) as never,
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults]);

  // Registration picker options load as the student changes.
  const currentStudentId = form.watch("studentId");
  const [regOptions, setRegOptions] = React.useState<
    PaymentRegistrationPickerItem[]
  >([]);
  const [regLoading, setRegLoading] = React.useState(false);

  React.useEffect(() => {
    if (!currentStudentId) {
      setRegOptions([]);
      return;
    }
    const controller = new AbortController();
    setRegLoading(true);
    (async () => {
      try {
        const rows = await listRegistrationsForStudentPicker(currentStudentId);
        if (!controller.signal.aborted) setRegOptions(rows);
      } finally {
        if (!controller.signal.aborted) setRegLoading(false);
      }
    })();
    return () => controller.abort();
  }, [currentStudentId]);

  const currentMethod = form.watch("method") ?? "CASH";
  const referenceLabel =
    PAYMENT_METHOD_REFERENCE_LABEL[
      currentMethod as keyof typeof PAYMENT_METHOD_REFERENCE_LABEL
    ] ?? "Reference";
  const hasReferenceLabel =
    !!currentMethod && currentMethod in PAYMENT_METHOD_REFERENCE_LABEL;

  const [pending, startTransition] = React.useTransition();

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res =
        mode === "edit"
          ? await updatePayment(values as unknown as UpdatePaymentInput)
          : await createPayment(values as unknown as CreatePaymentInput);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "edit" ? "Payment updated" : "Payment recorded");
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {mode === "edit" ? "Edit payment" : "Record payment"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Change amount, method, status or dates."
              : "Log money received — cash, card, transfer or online."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="payment-form"
            onSubmit={onSubmit}
            className="flex-1 overflow-y-auto px-4 pb-4"
          >
            <FormSection title="Who">
              {lockedStudentId ? (
                <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Student
                  </div>
                  <div className="mt-0.5 font-medium">
                    {lockedStudentName ?? "Selected student"}
                  </div>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pick a student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {[s.firstName, s.lastName]
                                .filter(Boolean)
                                .join(" ") || "Unnamed"}
                              {s.email ? (
                                <span className="ms-2 text-xs text-muted-foreground">
                                  {s.email}
                                </span>
                              ) : null}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="registrationId"
                render={({ field }) => {
                  const selected =
                    typeof field.value === "string" && field.value
                      ? field.value
                      : "__none";
                  return (
                    <FormItem>
                      <FormLabel>Registration (optional)</FormLabel>
                      <Select
                        value={selected}
                        onValueChange={(v) =>
                          field.onChange(v === "__none" ? undefined : v)
                        }
                        disabled={!currentStudentId || regLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                !currentStudentId
                                  ? "Pick a student first"
                                  : regLoading
                                  ? "Loading…"
                                  : "Not linked to a session"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none">
                            Not linked to a session
                          </SelectItem>
                          {regOptions.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.session.course.name}
                              {r.session.title ? ` · ${r.session.title}` : ""}
                              {" — "}
                              {format(r.session.startDate, "MMM d, yyyy")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link the payment to a specific session for course-level
                        reporting.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Amount">
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="1490"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
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
                          <SelectTrigger className="w-full">
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
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Method</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
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
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {humanizeStatus(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSectionDivider />

            <FormSection title="Details">
              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid at</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave blank on non-completed statuses — auto-set to now
                      when marked Completed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{referenceLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          hasReferenceLabel
                            ? `Enter ${referenceLabel.toLowerCase()}`
                            : "Receipt or transaction id (optional)"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
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
            <Button type="submit" form="payment-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {mode === "edit" ? "Save changes" : "Record payment"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
