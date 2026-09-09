import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, SectionTitle } from "@/components/ui-kit";
import { amIAdmin, createJob, deleteJob, listJobs } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — manage jobs — ResumeRank AI" },
      { name: "description", content: "Add, edit and remove the roles the matching engine uses." },
      { property: "og:title", content: "Admin — manage jobs — ResumeRank AI" },
      { property: "og:description", content: "Manage the job dataset used for resume matching." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const add = useServerFn(createJob);
  const remove = useServerFn(deleteJob);

  const { data: adminData, isLoading } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => listJobs() });

  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "Remote",
    description: "",
    experience_level: "Entry",
    skills: "",
  });

  const create = useMutation({
    mutationFn: () =>
      add({
        data: {
          title: form.title,
          company: form.company,
          location: form.location,
          description: form.description,
          experience_level: form.experience_level,
          required_skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Job added");
      setForm({ title: "", company: "", location: "Remote", description: "", experience_level: "Entry", skills: "" });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add the job"),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Job removed");
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("Could not remove that job"),
  });

  if (isLoading) {
    return (
      <SiteShell>
        <p className="mx-auto max-w-4xl px-4 py-20 text-muted-foreground">Checking your access…</p>
      </SiteShell>
    );
  }

  if (!adminData?.isAdmin) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">
            This page manages the job dataset. Ask an admin to grant your account the admin role.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-14">
        <SectionTitle eyebrow="Admin" title="Manage jobs" sub="Roles added here are matched against every resume." />

        <Card>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Field label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
            <Field label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            <Field
              label="Experience level"
              value={form.experience_level}
              onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Field
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Required skills (comma separated)"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="React, TypeScript, SQL"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add job"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {job.title} · <span className="text-muted-foreground">{job.company}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.required_skills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Delete job" onClick={() => del.mutate(job.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
