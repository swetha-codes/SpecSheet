import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { coerceSummary, type DatasheetSummary } from "./summary";

const specItems = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      label: { type: "string" },
      value: { type: "string" },
    },
    required: ["label", "value"],
  },
} as const;

const summarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    component_name: { type: "string" },
    manufacturer: { type: "string" },
    overview: { type: "string" },
    voltage: specItems,
    current: specItems,
    package_info: specItems,
    temperature: specItems,
    absolute_max: specItems,
    pinout: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          pin: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["pin", "name", "description"],
      },
    },
    key_features: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
  },
  required: [
    "component_name",
    "manufacturer",
    "overview",
    "voltage",
    "current",
    "package_info",
    "temperature",
    "absolute_max",
    "pinout",
    "key_features",
    "warnings",
    "tags",
  ],
} as const;

const SYSTEM_PROMPT = `You are a senior hardware engineer summarising electronic component datasheets.
Extract only facts present in the provided datasheet text. Never invent numbers.
Keep spec values short and unit-accurate (e.g. "2.7 V to 5.5 V", "-40 °C to +125 °C", "SOIC-8").
Use the label field for the parameter name and value for the figure with units.
warnings must list critical cautions such as ESD sensitivity, absolute maximum rating stress notes,
thermal limits, reflow/handling requirements. tags: 3-6 short lowercase keywords (component class, family, interface).
If information is absent, return an empty array for that category rather than guessing.`;

export const summarizeDatasheet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().min(40, "Not enough text found in that PDF."),
        sourceName: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<DatasheetSummary> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const body = {
      model: "openai/gpt-6-astra",
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      instructions: SYSTEM_PROMPT,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Datasheet file: ${data.sourceName ?? "uploaded.pdf"}\n\nDATASHEET TEXT:\n${data.text.slice(0, 120000)}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "datasheet_summary",
          strict: true,
          schema: summarySchema,
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI is busy right now. Try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits are exhausted. Add credits to keep summarising datasheets.");
      throw new Error(`Summarisation failed (${res.status}). ${detail.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (event.type === "response.output_text.delta" && event.delta) text += event.delta;
            if (event.type === "response.completed" && !text && event.response?.output_text)
              text = event.response.output_text;
          } catch {
            // ignore keep-alive / partial frames
          }
        }
      }
    }

    if (!text.trim()) throw new Error("The AI returned an empty summary. Try again.");

    try {
      return coerceSummary(JSON.parse(text));
    } catch {
      throw new Error("Could not read the AI summary. Try again.");
    }
  });

export const fetchPdfFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data }) => {
    const res = await fetch(data.url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 SpecSheet/1.0", Accept: "application/pdf,*/*" },
    });
    if (!res.ok) throw new Error(`Could not download that file (${res.status}).`);

    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.byteLength > 25 * 1024 * 1024) throw new Error("That PDF is larger than 25 MB.");
    const header = new TextDecoder().decode(buffer.slice(0, 5));
    if (!header.startsWith("%PDF")) throw new Error("That link does not point to a PDF file.");

    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buffer.length; i += chunk) {
      binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
    }

    const name = decodeURIComponent(new URL(data.url).pathname.split("/").pop() || "datasheet.pdf");
    return { base64: btoa(binary), name };
  });
