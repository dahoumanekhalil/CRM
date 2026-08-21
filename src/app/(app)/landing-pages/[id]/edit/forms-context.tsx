"use client";

import * as React from "react";

export interface FormPickerItem {
  id: string;
  name: string;
  fieldCount: number;
}

const FormsContext = React.createContext<FormPickerItem[]>([]);

export function FormsProvider({
  forms,
  children,
}: {
  forms: FormPickerItem[];
  children: React.ReactNode;
}) {
  return (
    <FormsContext.Provider value={forms}>{children}</FormsContext.Provider>
  );
}

export function useForms() {
  return React.useContext(FormsContext);
}
