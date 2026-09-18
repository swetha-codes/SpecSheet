import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FolderPlus, Loader2, Search, Upload, Link2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { fetchPdfFromUrl, summarizeDatasheet } from "@/lib/datasheet.functions";
import { extractPdfText } from "@/lib/pdf-text";
import { coerceSummary, summaryToMarkdown, type DatasheetSummary } from "@/lib/summary";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library — SpecSheet" },
      { name: "description", content: "Your summarised datasheets, tags and projects." },
      { property: "og:title", content: "Library — SpecSheet" },
      { property: "og:description", content: "Your summarised datasheets, tags and projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

interface DatasheetRow {
  id: string;
  component_name: string;
  manufacturer: string | null;
  source_name: string | null;
  source_url: string | null;
  tags: string[];
  project_id: string | null;
  created_at: string;
  summary: unknown;
}

interface ProjectRow {
  id: string;
  name: string;
}

function LibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [newProject, setNewProject] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const summarize = useServerFn(summarizeDatasheet);
  const downloadPdf = useServerFn(fetchPdfFromUrl);

  const sheets = useQuery({
    queryKey: ["datasheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasheets")
        .select("id, component_name, manufacturer, source_name, source_url, tags, project_id, created_at, summary")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DatasheetRow[];
    },
  });

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (name: string) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in.");
      const { error } = await supabase
        .from("projects")
        .insert({ name, user_id: auth.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewProject("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignProject = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string | null }) => {
      const { error } = await supabase.from("datasheets").update({ project_id: projectId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["datasheets"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function saveSummary(summary: DatasheetSummary, source: { name: string; url: string | null }) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in.");
    const { data, error } = await supabase
      .from("datasheets")
      .insert({
        user_id: auth.user.id,
        project_id: activeProject,
        component_name: summary.component_name || source.name,
        manufacturer: summary.manufacturer || null,
        source_name: source.name,
        source_url: source.url,
        tags: summary.tags,
        summary: JSON.parse(JSON.stringify(summary)),
        markdown: summaryToMarkdown(summary),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const process = useMutation({
    mutationFn: async (input: { buffer: ArrayBuffer; name: string; url: string | null }) => {
      setStatus("Reading the PDF…");
      const text = await extractPdfText(input.buffer);
      if (text.length < 200) throw new Error("No readable text found — this PDF may be a scan.");
      setStatus("Extracting specs with AI…");
      const summary = await summarize({ data: { text, sourceName: input.name } });
      setStatus("Saving…");
      return saveSummary(coerceSummary(summary), { name: input.name, url: input.url });
    },
    onSuccess: (id) => {
      setStatus(null);
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["datasheets"] });
      navigate({ to: "/sheet/$id", params: { id } });
    },
    onError: (e: Error) => {
      setStatus(null);
      toast.error(e.message);
    },
  });

  async function handleFile(file: File) {
    if (file.type && !file.type.includes("pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    process.mutate({ buffer: await file.arrayBuffer(), name: file.name, url: null });
  }

  async function handleUrl() {
    if (!url.trim()) return;
    try {
      setStatus("Downloading PDF…");
      const file = await downloadPdf({ data: { url: url.trim() } });
      const binary = atob(file.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      process.mutate({ buffer: bytes.buffer, name: file.name, url: url.trim() });
    } catch (e) {
      setStatus(null);
      toast.error(e instanceof Error ? e.message : "Could not fetch that link.");
    }
  }

  const busy = process.isPending || status !== null;

  const filtered = (sheets.data ?? []).filter((s) => {
    if (activeProject && s.project_id !== activeProject) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [s.component_name, s.manufacturer ?? "", s.source_name ?? "", ...s.tags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <section className="panel p-5">
          <h1 className="text-lg font-semibold">New summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a datasheet PDF, or paste a direct link to one.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) await handleFile(file);
              }}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center"
            >
              <Upload className="size-5 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Drop a PDF here</p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Choose file
              </Button>
            </div>

            <div className="flex flex-col justify-center gap-3 rounded-lg border border-border p-6">
              <div className="flex items-center gap-2">
                <Link2 className="size-4 text-primary" />
                <span className="spec-label">Datasheet URL</span>
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/lm358.pdf"
                className="font-mono text-xs"
                disabled={busy}
              />
              <Button onClick={handleUrl} disabled={busy || !url.trim()} size="sm">
                Summarise link
              </Button>
            </div>
          </div>

          {status && (
            <p className="mt-4 flex items-center gap-2 text-sm text-primary">
              <Loader2 className="size-4 animate-spin" /> {status}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by component name or tag"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="New project"
                className="w-36"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Create project"
                disabled={!newProject.trim()}
                onClick={() => createProject.mutate(newProject.trim())}
              >
                <FolderPlus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveProject(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeProject === null
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {(projects.data ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(activeProject === p.id ? null : p.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  activeProject === p.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {sheets.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your library…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Summarise your first datasheet above.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((sheet) => (
                <div key={sheet.id} className="panel flex flex-col p-4">
                  <Link to="/sheet/$id" params={{ id: sheet.id }} className="group">
                    <h3 className="font-mono text-sm font-semibold group-hover:text-primary">
                      {sheet.component_name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sheet.manufacturer || sheet.source_name || "—"}
                    </p>
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sheet.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="font-mono text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto pt-4">
                    <select
                      value={sheet.project_id ?? ""}
                      onChange={(e) =>
                        assignProject.mutate({ id: sheet.id, projectId: e.target.value || null })
                      }
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground"
                    >
                      <option value="">No project</option>
                      {(projects.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
