import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, SectionTitle } from "@/components/ui-kit";
import { deleteResume, listResumes } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Resume history — ResumeRank AI" },
      { name: "description", content: "Every resume you've analysed, with its score and detected skills." },
      { property: "og:title", content: "Resume history — ResumeRank AI" },
      { property: "og:description", content: "Track how your resume score improves over time." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const queryClient = useQueryClient();
  const list = useServerFn(listResumes);
  const remove = useServerFn(deleteResume);

  const { data: resumes = [], isLoading } = useQuery({ queryKey: ["resumes"], queryFn: () => list() });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Resume deleted");
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
      void queryClient.invalidateQueries({ queryKey: ["analysis"] });
    },
    onError: () => toast.error("Could not delete that resume"),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-14">
        <SectionTitle
          eyebrow="History"
          title="Your past analyses"
          sub="Open any run to revisit its score, matches and skill gaps."
        />

        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}

        {!isLoading && resumes.length === 0 ? (
          <Card>
            <p className="text-muted-foreground">You haven't analysed a resume yet.</p>
            <Link to="/upload" className="mt-4 inline-flex">
              <Button>Upload your first resume</Button>
            </Link>
          </Card>
        ) : null}

        <div className="space-y-4">
          {resumes.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} · {r.skills.length} skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.skills.slice(0, 6).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-bold tabular-nums text-primary">{r.score}</span>
                <Link to="/dashboard" search={{ resume: r.id }}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete resume"
                  onClick={() => del.mutate(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
