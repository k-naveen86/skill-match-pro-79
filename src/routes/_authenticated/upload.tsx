import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site-shell";
import { Button, Card, SectionTitle } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { analyzeResume } from "@/lib/ai.functions";
import { extractResumeText } from "@/lib/resume-text";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload your resume — ResumeRank AI" },
      {
        name: "description",
        content: "Drop a PDF or DOCX resume and get instant AI skill extraction, scoring and job matches.",
      },
      { property: "og:title", content: "Upload your resume — ResumeRank AI" },
      { property: "og:description", content: "Instant AI resume screening in a few seconds." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeResume);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleAnalyze(selected: File) {
    setStatus("Reading your file…");
    try {
      const text = await extractResumeText(selected);
      if (text.length < 60) {
        throw new Error("We couldn't read enough text. If your resume is a scanned image, upload a text PDF.");
      }

      setStatus("Saving the file securely…");
      let filePath: string | null = null;
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const path = `${userData.user.id}/${Date.now()}-${selected.name}`;
        const { error } = await supabase.storage.from("resumes").upload(path, selected);
        if (!error) filePath = path;
      }

      setStatus("AI is extracting skills and matching jobs…");
      const result = await analyze({ data: { fileName: selected.name, filePath, text } });
      toast.success("Analysis complete");
      navigate({ to: "/dashboard", search: { resume: result.resumeId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setStatus(null);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-14">
        <SectionTitle
          eyebrow="Step 1"
          title="Upload your resume"
          sub="PDF, DOCX or TXT up to 10MB. Your file stays private to your account."
        />

        <Card>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped && !status) {
                setFile(dropped);
                void handleAnalyze(dropped);
              }
            }}
            onClick={() => !status && inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-16 text-center transition-colors",
              dragging && "border-primary bg-accent/40",
              status && "pointer-events-none opacity-70",
            )}
          >
            {status ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-medium">{status}</p>
                <p className="text-sm text-muted-foreground">This usually takes 5–15 seconds.</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-primary" />
                <p className="font-medium">Drag & drop your resume here</p>
                <p className="text-sm text-muted-foreground">or click to browse your files</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) {
                  setFile(selected);
                  void handleAnalyze(selected);
                }
              }}
            />
          </div>

          {file && !status ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" /> {file.name}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              Go to dashboard
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/jobs" })}>
              Browse roles
            </Button>
          </div>
        </Card>

        <Card className="bg-surface">
          <h3 className="font-semibold">What happens next</h3>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>1. Text is extracted from your file in your browser.</li>
            <li>2. AI pulls out skills, education and experience.</li>
            <li>3. Your skills are compared against every open role.</li>
            <li>4. You get a score, ranked job matches and your skill gaps.</li>
          </ol>
        </Card>
      </div>
    </SiteShell>
  );
}
