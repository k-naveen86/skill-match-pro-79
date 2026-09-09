import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";

import { SiteShell } from "@/components/site-shell";
import { Badge, Card, SectionTitle } from "@/components/ui-kit";
import { listJobs } from "@/lib/jobs.functions";

const jobsQuery = queryOptions({ queryKey: ["jobs"], queryFn: () => listJobs() });

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Open roles & required skills — ResumeRank AI" },
      {
        name: "description",
        content:
          "Browse the job dataset used for matching: titles, companies, locations and the exact skills each role requires.",
      },
      { property: "og:title", content: "Open roles & required skills — ResumeRank AI" },
      { property: "og:description", content: "See which skills each role requires before you apply." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(jobsQuery),
  component: JobsPage,
  errorComponent: () => (
    <SiteShell>
      <p className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Jobs could not be loaded.</p>
    </SiteShell>
  ),
});

function JobsPage() {
  const { data: jobs } = useSuspenseQuery(jobsQuery);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14">
        <SectionTitle
          eyebrow="Job dataset"
          title="Open roles we match against"
          sub="Every resume is compared with these roles. Match score = share of required skills your resume proves."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col gap-3">
              <div>
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {job.company}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{job.description}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {job.required_skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
