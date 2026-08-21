// Form builder types — shared between the builder UI, the API, and the block renderer.

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "number"
  | "date"
  | "location";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select, radio
  helperText?: string;
}

export interface FormSettings {
  heading?: string;
  subheading?: string;
  submitLabel?: string;
  successHeading?: string;
  successMessage?: string;
  privacyNote?: string;
}

// The definition injected at render time — not stored in block JSON.
export interface FormDefinition {
  id: string;
  name: string;
  fields: FormField[];
  settings: FormSettings;
}
