import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Search, Columns2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpecSheet — datasheet specs, extracted in seconds" },
      {
        name: "description",
        content:
          "Upload an electronic component datasheet and get voltage, current, package, temperature, pinout and critical warnings in clean spec cards.",
      },
      { property: "og:title", content: "SpecSheet — datasheet specs, extracted in seconds" },
      {
        property: "og:description",
        content:
          "Upload a datasheet PDF and get the key electrical specs, pinout and warnings as structured cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "Spec cards, not walls of text",
    body: "Voltage, current, package, temperature, absolute max ratings and pinout — one card each.",
  },
  {
    icon: ShieldAlert,
    title: "Critical notes surfaced",
    body: "ESD sensitivity, handling and stress warnings pulled out of the fine print.",
  },
  {
    icon: Search,
    title: "Searchable library",
    body: "Tag sheets, group them into projects, and find any part later by name or tag.",
  },
  {
    icon: Columns2,
    title: "Side-by-side compare",
    body: "Put two parts next to each other and read the differences off one table.",
  },
];

function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold tracking-tight">
          spec<span className="text-primary">sheet</span>
        </span>
        <Link to="/auth" className="spec-label hover:text-foreground">
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="spec-label">Datasheet → structured specs</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Understand any component datasheet in{" "}
          <span className="text-primary">under a minute</span>.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Drop in a PDF or paste a link. SpecSheet reads the document and returns the numbers that
          matter, in clean cards you can copy as markdown.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/library"
            className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start summarising
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Create an account
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-12 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="panel p-5">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
