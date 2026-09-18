import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { coerceSummary, type DatasheetSummary, type SpecItem } from "@/lib/summary";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => ({
    meta: [
      { title: "Compare components — SpecSheet" },
      { name: "description", content: "Put two datasheet summaries side by side." },
      { property: "og:title", content: "Compare components — SpecSheet" },
      { property: "og:description", content: "Put two datasheet summaries side by side." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComparePage,
});

interface Row {
  id: string;
  component_name: string;
  summary: unknown;
}

const groups: { title: string; key: keyof DatasheetSummary }[] = [
  { title: "Voltage", key: "voltage" },
  { title: "Current", key: "current" },
  { title: "Package", key: "package_info" },
  { title: "Operating temperature", key: "temperature" },
  { title: "Absolute maximum ratings", key: "absolute_max" },
];

function specText(items: SpecItem[]) {
  if (!items.length) return "—";
  return items.map((i) => `${i.label}: ${i.value}`).join("\n");
}

function ComparePage() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const sheets = useQuery({
    queryKey: ["datasheets", "compare"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasheets")
        .select("id, component_name, summary")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = sheets.data ?? [];
  const a = rows.find((r) => r.id === left);
  const b = rows.find((r) => r.id === right);
  const sa = a ? coerceSummary(a.summary) : null;
  const sb = b ? coerceSummary(b.summary) : null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <div>
          <h1 className="text-lg font-semibold">Compare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick two summarised datasheets to see their specs side by side.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: left, set: setLeft, label: "Component A" },
            { value: right, set: setRight, label: "Component B" },
          ].map((slot) => (
            <label key={slot.label} className="space-y-2">
              <span className="spec-label">{slot.label}</span>
              <select
                value={slot.value}
                onChange={(e) => slot.set(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm"
              >
                <option value="">Select…</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.component_name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {sa && sb ? (
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="spec-label p-4 text-left">Spec</th>
                  <th className="p-4 text-left font-mono text-sm text-primary">{sa.component_name}</th>
                  <th className="p-4 text-left font-mono text-sm text-primary">{sb.component_name}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.title} className="border-b border-border/50 align-top last:border-0">
                    <td className="spec-label p-4">{g.title}</td>
                    <td className="spec-value whitespace-pre-line p-4">
                      {specText(sa[g.key] as SpecItem[])}
                    </td>
                    <td className="spec-value whitespace-pre-line p-4">
                      {specText(sb[g.key] as SpecItem[])}
                    </td>
                  </tr>
                ))}
                <tr className="align-top">
                  <td className="spec-label p-4">Warnings</td>
                  <td className="p-4 text-muted-foreground">
                    {sa.warnings.join(" · ") || "—"}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {sb.warnings.join(" · ") || "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select two components to compare.</p>
        )}
      </main>
    </div>
  );
}
