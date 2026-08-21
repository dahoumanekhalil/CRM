"use client";

import * as React from "react";
import geoData from "@/lib/algeria-geo.json";

type GeoEntry = { id: string; name_en: string; name_ar: string };
type DairaEntry = GeoEntry & { wilaya_id: string };
type CommuneEntry = GeoEntry & { daira_id: string };

const wilayas = geoData.wilayas as GeoEntry[];
const dairas = geoData.dairas as DairaEntry[];
const communes = geoData.communes as CommuneEntry[];

// Build a map: wilaya_id → commune ids (via daira bridge)
const wilayaCommunes = new Map<string, CommuneEntry[]>();
for (const wilaya of wilayas) {
  const dairaIds = new Set(
    dairas.filter((d) => d.wilaya_id === wilaya.id).map((d) => d.id)
  );
  wilayaCommunes.set(
    wilaya.id,
    communes.filter((c) => dairaIds.has(c.daira_id))
  );
}

export interface LocationValue {
  wilaya: string;
  commune: string;
}

export function parseLocationValue(raw: string): LocationValue {
  try {
    const parsed = JSON.parse(raw) as LocationValue;
    return { wilaya: parsed.wilaya ?? "", commune: parsed.commune ?? "" };
  } catch {
    return { wilaya: "", commune: "" };
  }
}

export function formatLocationValue(v: LocationValue): string {
  return JSON.stringify(v);
}

export function locationDisplayText(raw: string): string {
  const v = parseLocationValue(raw);
  return [v.wilaya, v.commune].filter(Boolean).join(" / ");
}

interface LocationFieldProps {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  selectClass?: string;
}

export function LocationField({
  value,
  onChange,
  required,
  disabled,
  selectClass = "",
}: LocationFieldProps) {
  const parsed = parseLocationValue(value);

  const [selectedWilayaId, setSelectedWilayaId] = React.useState(() => {
    if (!parsed.wilaya) return "";
    return wilayas.find((w) => w.name_en === parsed.wilaya)?.id ?? "";
  });
  const [selectedCommuneId, setSelectedCommuneId] = React.useState(() => {
    if (!parsed.commune) return "";
    return communes.find((c) => c.name_en === parsed.commune)?.id ?? "";
  });

  const filteredCommunes = React.useMemo(
    () => (selectedWilayaId ? (wilayaCommunes.get(selectedWilayaId) ?? []) : []),
    [selectedWilayaId]
  );

  function onWilayaChange(wId: string) {
    setSelectedWilayaId(wId);
    setSelectedCommuneId("");
    const w = wilayas.find((x) => x.id === wId)?.name_en ?? "";
    onChange(formatLocationValue({ wilaya: w, commune: "" }));
  }

  function onCommuneChange(cId: string) {
    setSelectedCommuneId(cId);
    const w = wilayas.find((x) => x.id === selectedWilayaId)?.name_en ?? "";
    const c = communes.find((x) => x.id === cId)?.name_en ?? "";
    onChange(formatLocationValue({ wilaya: w, commune: c }));
  }

  return (
    <div className="space-y-2">
      <select
        value={selectedWilayaId}
        onChange={(e) => onWilayaChange(e.target.value)}
        required={required && !selectedWilayaId}
        disabled={disabled}
        aria-label="Wilaya"
        className={selectClass}
      >
        <option value="">Select wilaya…</option>
        {wilayas.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name_en} ({w.name_ar})
          </option>
        ))}
      </select>

      <select
        value={selectedCommuneId}
        onChange={(e) => onCommuneChange(e.target.value)}
        required={required && !!selectedWilayaId && !selectedCommuneId}
        disabled={disabled || !selectedWilayaId}
        aria-label="City"
        className={selectClass}
      >
        <option value="">
          {selectedWilayaId ? "Select city…" : "Select a wilaya first"}
        </option>
        {filteredCommunes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_en} ({c.name_ar})
          </option>
        ))}
      </select>
    </div>
  );
}
