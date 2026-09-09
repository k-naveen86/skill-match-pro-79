import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Download, MapPin, Sparkles } from "lucide-react";
import { z } from "zod";

import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, ProgressBar, ScoreRing, SectionTitle } from "@/components/ui-kit";
import { getAnalysisById, getLatestAnalysis } from "@/lib/ai.functions";

type Match = {
  job_id: string;
  title: string;
  company: string;
  location: string;
  experience_level: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: z.object({ resume: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Your resume dashboard — ResumeRank AI" },
      {
        name: "description",
        content: "See your resume score, extracted skills, ranked job matches and the skills you're missing.",
      },
      { property: "og:title", content: "Your resume dashboard — ResumeRank AI" },
      { property: "og:description", content: "Score, matches and skill gaps in one view." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { resume: resumeId } = Route.useSearch();
  const latest = useServerFn(getLatestAnalysis);
  const byId = useServerFn(getAnalysisById);

  const { data, isLoading } = useQuery({
    queryKey: ["analysis", resumeId ?? "latest"],
    queryFn: () => (resumeId ? byId({ data: { resumeId } }) : latest()),
  });

  if (isLoading) {
    return (
      <SiteShell>
        <p className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Loading your analysis…</p>
      </SiteShell>
    );
  }

  if (!data) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">No analysis yet</h1>
          <p className="mt-2 text-muted-foreground">Upload a resume to see your score and job matches.</p>
          <Link to="/upload" className="mt-6 inline-flex">
            <Button size="lg">Upload a resume</Button>
          </Link>
        </div>
      </SiteShell>
    );
  }

  const resume = data.resume;
  const matches = (data.analysis?.matches ?? []) as unknown as Match[];
  const education = (resume.education ?? []) as unknown as {
    degree?: string;
    institution?: string;
    year?: string;
  }[];
  const experience = (resume.experience ?? []) as unknown as {
    role?: string;
    company?: string;
    duration?: string;
  }[];
  const gaps = Array.from(new Set(matches.slice(0, 4).flatMap((m) => m.missing_skills))).slice(0, 14);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 print:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle eyebrow="Results" title={resume.file_name} sub={resume.summary ?? undefined} />
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Download className="h-4 w-4" /> Download report
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center gap-3">
            <ScoreRing score={resume.score} />
            <p className="text-sm text-muted-foreground">Overall resume score</p>
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Extracted skills
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {resume.skills.length ? (
                resume.skills.map((s) => <Badge key={s}>{s}</Badge>)
              ) : (
                <p className="text-sm text-muted-foreground">No skills detected.</p>
              )}
            </div>

            <h3 className="mt-6 font-semibold">Skill gaps to close</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {gaps.length ? (
                gaps.map((s) => (
                  <Badge key={s} tone="gap">
                    {s}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">You cover the top roles well.</p>
              )}
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-bold">Recommended jobs</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {matches.map((m) => (
              <Card key={m.job_id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{m.title}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> {m.company}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {m.location}
                      </span>
                    </p>
                  </div>
                  <span className="font-display text-2xl font-bold tabular-nums text-primary">
                    {m.score}%
                  </span>
                </div>
                <ProgressBar value={m.score} label="Match" />
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">You have</p>
                  <div className="flex flex-wrap gap-2">
                    {m.matched_skills.length ? (
                      m.matched_skills.map((s) => (
                        <Badge key={s} tone="match">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None yet</span>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing</p>
                  <div className="flex flex-wrap gap-2">
                    {m.missing_skills.length ? (
                      m.missing_skills.map((s) => (
                        <Badge key={s} tone="gap">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nothing — great fit</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="font-semibold">Education</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {education.length ? (
                education.map((e, i) => (
                  <li key={i}>
                    <p className="font-medium">{e.degree ?? "—"}</p>
                    <p className="text-muted-foreground">
                      {[e.institution, e.year].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">Nothing detected.</li>
              )}
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">Experience</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {experience.length ? (
                experience.map((e, i) => (
                  <li key={i}>
                    <p className="font-medium">{e.role ?? "—"}</p>
                    <p className="text-muted-foreground">
                      {[e.company, e.duration].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">Nothing detected.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
