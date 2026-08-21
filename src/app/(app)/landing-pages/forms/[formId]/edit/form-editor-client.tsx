"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Type,
  Mail,
  Phone,
  AlignLeft,
  List,
  CheckSquare,
  CircleDot,
  Hash,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { updateForm } from "../../actions";
import type { FormField, FormFieldType, FormSettings } from "@/lib/forms/types";

const FIELD_TYPES: Array<{
  type: FormFieldType;
  label: string;
  icon: React.ElementType;
}> = [
  { type: "text", label: "Text", icon: Type },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "textarea", label: "Long text", icon: AlignLeft },
  { type: "select", label: "Dropdown", icon: List },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "radio", label: "Radio", icon: CircleDot },
  { type: "number", label: "Number", icon: Hash },
  { type: "date", label: "Date", icon: Calendar },
  { type: "location", label: "Location (Algeria)", icon: MapPin },
];

function fieldIcon(type: FormFieldType) {
  return FIELD_TYPES.find((t) => t.type === type)?.icon ?? Type;
}

function newField(type: FormFieldType): FormField {
  const id = `field_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    type,
    label: FIELD_TYPES.find((t) => t.type === type)?.label ?? "Field",
    placeholder: "",
    required: false,
    options: type === "select" || type === "radio" ? ["Option 1", "Option 2"] : undefined,
  };
}

type FormShape = {
  id: string;
  name: string;
  description: string | null;
  fields: unknown;
  settings: unknown;
};

export function FormEditorClient({ form }: { form: FormShape }) {
  const [name, setName] = React.useState(form.name);
  const [description, setDescription] = React.useState(form.description ?? "");
  const [fields, setFields] = React.useState<FormField[]>(
    Array.isArray(form.fields) ? (form.fields as FormField[]) : []
  );
  const [settings, setSettings] = React.useState<FormSettings>(
    (form.settings ?? {}) as FormSettings
  );
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(true);

  // Track unsaved changes
  const initialRef = React.useRef(JSON.stringify({ name, fields, settings }));
  const isDirty = JSON.stringify({ name, fields, settings }) !== initialRef.current;

  function addField(type: FormFieldType) {
    const field = newField(type);
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
    setSaved(false);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
    setSaved(false);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
    setSaved(false);
  }

  function moveField(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setFields(next);
    setSaved(false);
  }

  function patchSettings(patch: Partial<FormSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateForm(form.id, { name, description: description || null, fields, settings });
      setSaved(true);
      initialRef.current = JSON.stringify({ name, fields, settings });
      toast.success("Form saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Topbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" asChild>
            <Link href={`/landing-pages/forms/${form.id}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold outline-none hover:border-border focus:border-border focus:bg-muted/40"
              aria-label="Form name"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs transition-opacity",
              saved && !isDirty
                ? "text-muted-foreground"
                : "text-amber-500"
            )}
          >
            {saved && !isDirty ? (
              <span className="flex items-center gap-1">
                <Check className="size-3" /> Saved
              </span>
            ) : (
              "Unsaved changes"
            )}
          </span>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fields panel */}
        <aside className="flex w-80 shrink-0 flex-col border-e border-border/70">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <h2 className="text-sm font-semibold">Fields</h2>
            <AddFieldDropdown onAdd={addField} />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {fields.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No fields yet. Add a field to get started.
                </p>
              </div>
            ) : (
              fields.map((field, idx) => {
                const Icon = fieldIcon(field.type);
                return (
                  <div
                    key={field.id}
                    onClick={() =>
                      setSelectedFieldId(
                        selectedFieldId === field.id ? null : field.id
                      )
                    }
                    className={cn(
                      "group flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition-colors",
                      selectedFieldId === field.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/50 bg-background hover:bg-muted/40"
                    )}
                  >
                    <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {field.type}
                        {field.required ? " · required" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(idx, idx - 1);
                        }}
                        disabled={idx === 0}
                        className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronDown className="size-3 rotate-180" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(idx, idx + 1);
                        }}
                        disabled={idx === fields.length - 1}
                        className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field.id);
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remove field"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border/70 p-3">
            <AddFieldDropdown onAdd={addField} fullWidth />
          </div>
        </aside>

        {/* Center: preview */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-muted/20 p-8">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
              {settings.heading ? (
                <h2 className="mb-1 text-xl font-bold">{settings.heading}</h2>
              ) : null}
              {settings.subheading ? (
                <p className="mb-5 text-sm text-muted-foreground">
                  {settings.subheading}
                </p>
              ) : null}
              <div className="space-y-4">
                {fields.map((field) => (
                  <PreviewField key={field.id} field={field} />
                ))}
                {fields.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Add fields from the left panel.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground opacity-80"
                >
                  {settings.submitLabel || "Submit"}
                </button>
                {settings.privacyNote ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {settings.privacyNote}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </main>

        {/* Right: settings / field editor */}
        <aside className="flex w-72 shrink-0 flex-col border-s border-border/70 overflow-y-auto">
          {selectedField ? (
            <FieldEditor
              field={selectedField}
              onChange={(patch) => updateField(selectedField.id, patch)}
              onClose={() => setSelectedFieldId(null)}
            />
          ) : (
            <FormSettingsPanel
              name={name}
              description={description}
              settings={settings}
              onNameChange={(v) => { setName(v); setSaved(false); }}
              onDescriptionChange={(v) => { setDescription(v); setSaved(false); }}
              onSettingsChange={patchSettings}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function AddFieldDropdown({
  onAdd,
  fullWidth,
}: {
  onAdd: (type: FormFieldType) => void;
  fullWidth?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5", fullWidth && "w-full justify-center")}
        >
          <Plus className="size-3.5" />
          Add field
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <Icon className="size-3.5" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PreviewField({ field }: { field: FormField }) {
  if (field.type === "location") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {field.label}
          {field.required ? <span className="ms-1 text-destructive">*</span> : null}
        </label>
        <div className="space-y-1.5">
          {["Wilaya", "City"].map((level) => (
            <div
              key={level}
              className="flex h-9 items-center justify-between rounded-md border border-input bg-muted/20 px-3 text-sm text-muted-foreground"
            >
              Select {level}…
              <ChevronDown className="size-3.5" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {field.label}
          {field.required ? <span className="ms-1 text-destructive">*</span> : null}
        </label>
        <div className="min-h-[72px] rounded-md border border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {field.placeholder || "Type here…"}
        </div>
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <div className="size-4 rounded border border-input bg-muted/20" />
        {field.label}
        {field.required ? <span className="text-destructive">*</span> : null}
      </label>
    );
  }
  if (field.type === "radio" || field.type === "select") {
    const options = field.options ?? [];
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {field.label}
          {field.required ? <span className="ms-1 text-destructive">*</span> : null}
        </label>
        {field.type === "select" ? (
          <div className="flex h-9 items-center justify-between rounded-md border border-input bg-muted/20 px-3 text-sm text-muted-foreground">
            {options[0] ?? "Select…"}
            <ChevronDown className="size-3.5" />
          </div>
        ) : (
          <div className="space-y-1">
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <div className="size-4 rounded-full border border-input bg-muted/20" />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {field.label}
        {field.required ? <span className="ms-1 text-destructive">*</span> : null}
      </label>
      <div className="flex h-9 items-center rounded-md border border-input bg-muted/20 px-3 text-sm text-muted-foreground">
        {field.placeholder || ""}
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onClose,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  onClose: () => void;
}) {
  const hasOptions = field.type === "select" || field.type === "radio";
  const isLocation = field.type === "location";
  const options = field.options ?? [];

  return (
    <>
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <h3 className="text-sm font-semibold">Field settings</h3>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <InspRow label="Type">
          <Select
            value={field.type}
            onValueChange={(v) => onChange({ type: v as FormFieldType })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map(({ type, label }) => (
                <SelectItem key={type} value={type}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InspRow>

        <InspRow label="Label">
          <Input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-8 text-sm"
          />
        </InspRow>

        {!isLocation && field.type !== "checkbox" ? (
          <InspRow label="Placeholder">
            <Input
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              className="h-8 text-sm"
              placeholder="Optional hint text"
            />
          </InspRow>
        ) : null}

        <InspRow label="Helper text">
          <Input
            value={field.helperText ?? ""}
            onChange={(e) => onChange({ helperText: e.target.value })}
            className="h-8 text-sm"
            placeholder="Shown below the field"
          />
        </InspRow>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Required</label>
          <Switch
            checked={field.required ?? false}
            onCheckedChange={(v) => onChange({ required: v })}
          />
        </div>

        {isLocation ? (
          <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Two cascading dropdowns: select a Wilaya, then pick a city from that wilaya. Covers all 58 wilayas and 1,535 communes.
          </p>
        ) : null}

        {hasOptions && !isLocation ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = e.target.value;
                    onChange({ options: next });
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() =>
                    onChange({ options: options.filter((_, i) => i !== idx) })
                  }
                >
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                onChange({ options: [...options, `Option ${options.length + 1}`] })
              }
            >
              <Plus className="size-3.5" />
              Add option
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function FormSettingsPanel({
  name,
  description,
  settings,
  onNameChange,
  onDescriptionChange,
  onSettingsChange,
}: {
  name: string;
  description: string;
  settings: FormSettings;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSettingsChange: (patch: Partial<FormSettings>) => void;
}) {
  return (
    <>
      <div className="border-b border-border/70 px-4 py-3">
        <h3 className="text-sm font-semibold">Form settings</h3>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <InspRow label="Internal name">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-8 text-sm"
          />
        </InspRow>
        <InspRow label="Description">
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
            className="text-sm"
            placeholder="Internal note"
          />
        </InspRow>

        <Divider label="Visible content" />

        <InspRow label="Heading">
          <Input
            value={settings.heading ?? ""}
            onChange={(e) => onSettingsChange({ heading: e.target.value })}
            className="h-8 text-sm"
            placeholder="Reserve your seat"
          />
        </InspRow>
        <InspRow label="Subheading">
          <Textarea
            value={settings.subheading ?? ""}
            onChange={(e) => onSettingsChange({ subheading: e.target.value })}
            rows={2}
            className="text-sm"
          />
        </InspRow>
        <InspRow label="Submit button">
          <Input
            value={settings.submitLabel ?? ""}
            onChange={(e) => onSettingsChange({ submitLabel: e.target.value })}
            className="h-8 text-sm"
            placeholder="Submit"
          />
        </InspRow>
        <InspRow label="Privacy note">
          <Input
            value={settings.privacyNote ?? ""}
            onChange={(e) => onSettingsChange({ privacyNote: e.target.value })}
            className="h-8 text-sm"
            placeholder="We won't share your data."
          />
        </InspRow>

        <Divider label="After submit" />

        <InspRow label="Success heading">
          <Input
            value={settings.successHeading ?? ""}
            onChange={(e) =>
              onSettingsChange({ successHeading: e.target.value })
            }
            className="h-8 text-sm"
            placeholder="Thanks!"
          />
        </InspRow>
        <InspRow label="Success message">
          <Textarea
            value={settings.successMessage ?? ""}
            onChange={(e) =>
              onSettingsChange({ successMessage: e.target.value })
            }
            rows={2}
            className="text-sm"
          />
        </InspRow>
      </div>
    </>
  );
}

function InspRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}
