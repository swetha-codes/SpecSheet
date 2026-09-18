import { AlertTriangle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DatasheetSummary, SpecItem } from "@/lib/summary";

function SpecCard({ title, items }: { title: string; items: SpecItem[] }) {
  if (!items.length) return null;
  return (
    <section className="panel p-5">
      <h2 className="spec-label">{title}</h2>
      <dl className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <div key={`${item.label}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="spec-value text-right">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function SpecCards({ summary }: { summary: DatasheetSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SpecCard title="Voltage" items={summary.voltage} />
      <SpecCard title="Current" items={summary.current} />
      <SpecCard title="Package" items={summary.package_info} />
      <SpecCard title="Operating temperature" items={summary.temperature} />
      <SpecCard title="Absolute maximum ratings" items={summary.absolute_max} />

      {summary.key_features.length > 0 && (
        <section className="panel p-5">
          <h2 className="spec-label flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" /> Key features
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.key_features.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.pinout.length > 0 && (
        <section className="panel overflow-hidden p-5 md:col-span-2">
          <h2 className="spec-label">Pinout</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="spec-label py-2 text-left">Pin</th>
                  <th className="spec-label py-2 text-left">Name</th>
                  <th className="spec-label py-2 text-left">Function</th>
                </tr>
              </thead>
              <tbody>
                {summary.pinout.map((p, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="spec-value py-2 pr-4">{p.pin}</td>
                    <td className="spec-value py-2 pr-4 text-primary">{p.name}</td>
                    <td className="py-2 text-muted-foreground">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {summary.warnings.length > 0 && (
        <section className="panel border-warning/40 p-5 md:col-span-2">
          <h2 className="spec-label flex items-center gap-2 text-warning">
            <AlertTriangle className="size-3.5" /> Warnings &amp; critical notes
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.warnings.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-warning">!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 md:col-span-2">
          {summary.tags.map((t) => (
            <Badge key={t} variant="secondary" className="font-mono text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
