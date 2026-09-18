export interface SpecItem {
  label: string;
  value: string;
}

export interface PinoutItem {
  pin: string;
  name: string;
  description: string;
}

export interface DatasheetSummary {
  component_name: string;
  manufacturer: string;
  overview: string;
  voltage: SpecItem[];
  current: SpecItem[];
  package_info: SpecItem[];
  temperature: SpecItem[];
  absolute_max: SpecItem[];
  pinout: PinoutItem[];
  key_features: string[];
  warnings: string[];
  tags: string[];
}

export const emptySummary: DatasheetSummary = {
  component_name: "Unknown component",
  manufacturer: "",
  overview: "",
  voltage: [],
  current: [],
  package_info: [],
  temperature: [],
  absolute_max: [],
  pinout: [],
  key_features: [],
  warnings: [],
  tags: [],
};

function specBlock(title: string, items: SpecItem[]): string {
  if (!items.length) return "";
  return `### ${title}\n${items.map((i) => `- **${i.label}:** \`${i.value}\``).join("\n")}\n\n`;
}

function listBlock(title: string, items: string[]): string {
  if (!items.length) return "";
  return `### ${title}\n${items.map((i) => `- ${i}`).join("\n")}\n\n`;
}

export function summaryToMarkdown(s: DatasheetSummary): string {
  let md = `# ${s.component_name}${s.manufacturer ? ` — ${s.manufacturer}` : ""}\n\n`;
  if (s.overview) md += `${s.overview}\n\n`;
  md += specBlock("Voltage", s.voltage);
  md += specBlock("Current", s.current);
  md += specBlock("Package", s.package_info);
  md += specBlock("Operating temperature", s.temperature);
  md += specBlock("Absolute maximum ratings", s.absolute_max);
  if (s.pinout.length) {
    md += `### Pinout\n| Pin | Name | Function |\n| --- | --- | --- |\n`;
    md += s.pinout.map((p) => `| ${p.pin} | ${p.name} | ${p.description} |`).join("\n");
    md += "\n\n";
  }
  md += listBlock("Key features", s.key_features);
  md += listBlock("Warnings & notes", s.warnings);
  if (s.tags.length) md += `_Tags: ${s.tags.join(", ")}_\n`;
  return md.trim() + "\n";
}

export function coerceSummary(value: unknown): DatasheetSummary {
  const v = (value ?? {}) as Partial<DatasheetSummary>;
  return {
    ...emptySummary,
    ...v,
    voltage: v.voltage ?? [],
    current: v.current ?? [],
    package_info: v.package_info ?? [],
    temperature: v.temperature ?? [],
    absolute_max: v.absolute_max ?? [],
    pinout: v.pinout ?? [],
    key_features: v.key_features ?? [],
    warnings: v.warnings ?? [],
    tags: v.tags ?? [],
  };
}
