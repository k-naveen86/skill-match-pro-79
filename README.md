# ResumeRank AI — AI Resume Screening & Job Recommendation System

Upload a resume (PDF/DOCX/TXT) and instantly get:

- AI-extracted **skills, education and experience**
- An overall **resume score (0–100)**
- **Ranked job matches** with a match percentage per role
- The **missing skills** standing between you and each job
- **Resume history** so you can re-upload and watch the score climb

## Live pages

| Route        | What it does                                          | Access        |
| ------------ | ----------------------------------------------------- | ------------- |
| `/`          | Landing page                                          | Public        |
| `/jobs`      | Job dataset with required skills                       | Public        |
| `/auth`      | Register / login (email + password, or Google)         | Public        |
| `/upload`    | Drag & drop resume upload + analysis                   | Signed in     |
| `/dashboard` | Score, skills, matches, skill gaps, printable report   | Signed in     |
| `/history`   | Every past analysis                                    | Signed in     |
| `/admin`     | Add / remove jobs                                      | Admin role    |

## Tech stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | React 19, TanStack Router/Start, Tailwind CSS v4, TanStack Query, lucide    |
| Backend   | TanStack Start **server functions** (typed RPC, replaces an Express server) |
| Database  | Postgres (Lovable Cloud) with row-level security                            |
| Auth      | Email/password + Google, JWT sessions, protected route layout               |
| Storage   | Private per-user resume file bucket                                         |
| AI / NLP  | Lovable AI Gateway (`google/gemini-3.8-flash`) for skill extraction         |
| Parsing   | `pdfjs-dist` (PDF) + `mammoth` (DOCX), executed in the browser              |

> Note on architecture: the classic MERN layout (Express `server.js` + MongoDB +
> `axios`) is replaced here by TanStack server functions on Postgres. The
> responsibilities are identical — authentication middleware, controllers,
> models, protected routes — they just live inside one deployable app.

## Project structure

```
src/
├── components/
│   ├── site-shell.tsx        # header, nav, dark-mode toggle, footer
│   └── ui-kit.tsx            # Button, Card, Badge, ProgressBar, ScoreRing
├── lib/
│   ├── ai.functions.ts       # AI analysis + matching + resume CRUD (server)
│   ├── jobs.functions.ts     # job listing + admin job management (server)
│   └── resume-text.ts        # PDF/DOCX/TXT text extraction (browser)
├── routes/
│   ├── index.tsx             # home
│   ├── jobs.tsx              # public job dataset
│   ├── auth.tsx              # register / login
│   └── _authenticated/
│       ├── route.tsx         # auth gate for everything below
│       ├── upload.tsx        # drag & drop upload
│       ├── dashboard.tsx     # results
│       ├── history.tsx       # past analyses
│       └── admin.tsx         # job management
├── integrations/supabase/    # generated database/auth clients
└── styles.css                # design tokens (light + dark)
samples/
├── jobs.sample.json          # sample job dataset
└── sample-resume.txt         # sample resume to test with
supabase/migrations/          # database schema + seed data
```

## Data model

- **profiles** — `user_id`, `full_name`, `email` (created automatically on signup)
- **user_roles** — `user_id`, `role` (`admin` | `user`), checked by a `has_role()` security-definer function
- **jobs** — `title`, `company`, `location`, `description`, `required_skills[]`, `experience_level`
- **resumes** — `file_name`, `file_path`, `extracted_text`, `skills[]`, `education`, `experience`, `summary`, `score`
- **analyses** — `resume_id`, `matches` (ranked jobs with matched/missing skills), `top_score`

Row-level security: users can only read/write their own resumes, analyses and
profile; jobs are readable by everyone and writable only by admins.

## API surface (server functions)

| Function                             | Auth      | Purpose                                    |
| ------------------------------------ | --------- | ------------------------------------------ |
| `analyzeResume({ fileName, text })`  | required  | AI extraction + job matching + save        |
| `getLatestAnalysis()`                | required  | Latest resume + its analysis               |
| `getAnalysisById({ resumeId })`      | required  | One specific analysis                      |
| `listResumes()` / `deleteResume()`   | required  | Resume history                             |
| `listJobs()`                         | public    | Job dataset                                |
| `amIAdmin()`                         | required  | Admin check                                |
| `createJob()` / `deleteJob()`        | admin     | Manage jobs                                |

## Matching algorithm

1. AI returns a canonical skill list from the resume text.
2. Skills are normalised (lowercased, punctuation stripped).
3. For each job: `match % = matched required skills / total required skills`.
4. Missing skills = required skills not present in the resume.
5. Overall score = `0.4 × AI resume-quality score + 0.6 × best job match`.

## Running locally

```bash
bun install      # or npm install
bun run dev      # starts the app on http://localhost:8080
bun run build    # production build
```

### Environment variables

Copy `.env.example` to `.env`. On Lovable these are injected automatically.

```
VITE_SUPABASE_URL=            # database/auth URL (browser)
VITE_SUPABASE_PUBLISHABLE_KEY=# public key (browser)
SUPABASE_URL=                 # same URL (server)
SUPABASE_PUBLISHABLE_KEY=     # same public key (server)
SUPABASE_SERVICE_ROLE_KEY=    # server only, never exposed
LOVABLE_API_KEY=              # AI gateway key, server only
```

## Sample data

- `samples/jobs.sample.json` — the 12 seeded roles
- `samples/sample-resume.txt` — a realistic fresher resume you can upload to test

## Becoming an admin

Roles live in the `user_roles` table. Grant your account the admin role once and
`/admin` unlocks.
