import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { SpecCards } from "@/components/SpecCards";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { coerceSummary, summaryToMarkdown } from "@/lib/summary";

export const Route = createFileRoute("/_authenticated/sheet/$id")({
  head: () => ({
    meta: [
      { title: "Datasheet summary — SpecSheet" },
      { name: "description", content: "Extracted specs, pinout and warnings for this component." },
      { property: "og:title", content: "Datasheet summary — SpecSheet" },
      {
        property: "og:description",
        content: "Extracted specs, pinout and warnings for this component.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SheetPage,
});

function SheetPage() {
  const { id } = Route.useParams();

  const sheet = useQuery({
    queryKey: ["datasheet", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasheets")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (sheet.isLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!sheet.data) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="text-sm text-muted-foreground">That summary could not be found.</p>
          <Link to="/library" className="spec-label mt-3 inline-block hover:text-foreground">
            ← Back to library
          </Link>
        </div>
      </div>
    );
  }

  const summary = coerceSummary(sheet.data.summary);
  const markdown = sheet.data.markdown || summaryToMarkdown(summary);

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${summary.component_name.replace(/[^\w.-]+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <Link to="/library" className="spec-label inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3" /> Library
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-semibold">{summary.component_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.manufacturer || sheet.data.source_name || "Unknown source"}
            </p>
            {summary.overview && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed">{summary.overview}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(markdown);
                toast.success("Markdown copied");
              }}
            >
              <Copy className="mr-2 size-3.5" /> Copy markdown
            </Button>
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="mr-2 size-3.5" /> Export .md
            </Button>
            {sheet.data.source_url && (
              <Button variant="ghost" size="sm" asChild>
                <a href={sheet.data.source_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 size-3.5" /> Source
                </a>
              </Button>
            )}
          </div>
        </div>

        <SpecCards summary={summary} />
      </main>
    </div>
  );
}
