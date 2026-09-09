import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, BrainCircuit, FileSearch, Target } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Button, Card, SectionTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeRank AI — AI resume screening & job recommendations" },
      {
        name: "description",
        content:
          "Upload a resume and get AI-extracted skills, a 0-100 score, ranked job matches and the exact skills you're missing.",
      },
      { property: "og:title", content: "ResumeRank AI — AI resume screening & job recommendations" },
      {
        property: "og:description",
        content: "AI skill extraction, match scoring and job recommendations in seconds.",
      },
    ],
  }),
  component: Home,
});

const steps = [
  { icon: FileSearch, title: "Upload", body: "Drop a PDF or DOCX resume. Text is read right in your browser." },
  { icon: BrainCircuit, title: "Extract", body: "AI pulls out skills, education and experience automatically." },
  { icon: Target, title: "Match", body: "Your skills are scored against every open role in the dataset." },
  { icon: BarChart3, title: "Improve", body: "See the missing skills standing between you and each job." },
];

function Home() {
  return (
    <SiteShell>
      <section className="grid-bg border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            AI resume screening
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Know how your resume scores before a recruiter opens it
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Upload your resume, get an instant 0–100 score, ranked job matches and a clear list of the skills
            you still need.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/upload">
              <Button size="lg">Analyse my resume</Button>
            </Link>
            <Link to="/jobs">
              <Button size="lg" variant="outline">
                Browse open roles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-4 py-20">
        <SectionTitle
          eyebrow="How it works"
          title="Four steps, about fifteen seconds"
          sub="No manual tagging, no forms to fill. The whole pipeline runs from a single file."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.title} className="space-y-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Built for placement season</h2>
            <p className="text-muted-foreground">
              Every analysis is saved to your history, so you can rewrite your resume, re-upload it and watch the
              score climb. Admins can extend the job dataset with their own roles.
            </p>
            <Link to="/history">
              <Button variant="outline">See your history</Button>
            </Link>
          </div>
          <Card className="space-y-4">
            <p className="text-sm text-muted-foreground">Sample output</p>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-5xl font-bold text-primary">82</span>
              <span className="text-muted-foreground">overall resume score</span>
            </div>
            <p className="text-sm">
              Top match: <strong>Full Stack Engineer</strong> — 86% · Missing: AWS, Docker
            </p>
          </Card>
        </div>
      </section>
    </SiteShell>
  );
}
