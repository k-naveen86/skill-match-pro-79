import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  fileName: z.string().min(1).max(200),
  filePath: z.string().max(400).nullable().default(null),
  text: z.string().min(30, "The resume text is too short to analyse.").max(60000),
});

type Extracted = {
  skills: string[];
  education: { degree: string; institution: string; year: string }[];
  experience: { role: string; company: string; duration: string }[];
  summary: string;
  quality_score: number;
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.]/g, "");

async function extractWithAI(text: string): Promise<Extracted> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a resume parser. Return ONLY valid JSON with keys: skills (array of short canonical skill names like 'React', 'Python', 'SQL'), education (array of {degree, institution, year}), experience (array of {role, company, duration}), summary (max 300 chars), quality_score (0-100 integer judging clarity, structure, measurable impact and depth). No markdown fences.",
        },
        { role: "user", content: text.slice(0, 24000) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (response.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    throw new Error(`AI analysis failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<Extracted>;

  return {
    skills: (parsed.skills ?? []).filter((s) => typeof s === "string").slice(0, 60),
    education: (parsed.education ?? []).slice(0, 12),
    experience: (parsed.experience ?? []).slice(0, 12),
    summary: parsed.summary ?? "",
    quality_score: Math.max(0, Math.min(100, Math.round(Number(parsed.quality_score ?? 0)))),
  };
}

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const extracted = await extractWithAI(data.text);
    const skillSet = new Set(extracted.skills.map(normalize));

    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("id, title, company, location, experience_level, required_skills");
    if (jobsError) throw new Error(jobsError.message);

    const matches = (jobs ?? [])
      .map((job) => {
        const required = job.required_skills ?? [];
        const matched = required.filter((s) => skillSet.has(normalize(s)));
        const missing = required.filter((s) => !skillSet.has(normalize(s)));
        const score = required.length ? Math.round((matched.length / required.length) * 100) : 0;
        return {
          job_id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          experience_level: job.experience_level,
          score,
          matched_skills: matched,
          missing_skills: missing,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const topScore = matches[0]?.score ?? 0;
    const overall = Math.round(extracted.quality_score * 0.4 + topScore * 0.6);

    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        file_name: data.fileName,
        file_path: data.filePath,
        extracted_text: data.text.slice(0, 40000),
        skills: extracted.skills,
        education: extracted.education,
        experience: extracted.experience,
        summary: extracted.summary,
        score: overall,
      })
      .select("id")
      .single();
    if (resumeError) throw new Error(resumeError.message);

    const { error: analysisError } = await supabase.from("analyses").insert({
      resume_id: resume.id,
      user_id: userId,
      matches,
      top_score: topScore,
    });
    if (analysisError) throw new Error(analysisError.message);

    return { resumeId: resume.id };
  });

export const getLatestAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: resume } = await context.supabase
      .from("resumes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!resume) return null;

    const { data: analysis } = await context.supabase
      .from("analyses")
      .select("*")
      .eq("resume_id", resume.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { resume, analysis };
  });

export const getAnalysisById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ resumeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: resume } = await context.supabase
      .from("resumes")
      .select("*")
      .eq("id", data.resumeId)
      .maybeSingle();
    if (!resume) return null;

    const { data: analysis } = await context.supabase
      .from("analyses")
      .select("*")
      .eq("resume_id", resume.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { resume, analysis };
  });

export const listResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("resumes")
      .select("id, file_name, score, created_at, skills")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("resumes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
