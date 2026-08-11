# Bulletin Board Pro

Project: "Bulletin" — Cameroon secondary-school report card platform (full restoration)

I am restoring a production application that was fully built and then lost when I reset my account. Attached is a repomix (complete source dump) of the last working version. Your job is to rebuild this exactly, reconnect the backend from scratch (my Supabase project is gone too — nothing exists server-side), and apply a short list of hardening fixes I list at the end. This is not a prototype request. Treat every section below as a requirement, not a suggestion.

What this product is

A multi-tenant SaaS for Cameroonian secondary schools that replaces Excel/Word for report cards ("bulletins"). It must correctly support both national subsystems side by side, because a single school is always one or the other and the math/labels differ:

Francophone: 3 Trimestres/year, marks out of /20, weighted by coefficient, French labels.
Anglophone: 3 Terms/year, marks out of /100, weighted by coefficient, English labels.
Both subsystems run 2 sequences per term → 6 sequences per academic year. Only one sequence school-wide can be "open" for marking at any time — this is enforced server-side, not just in the UI, because the teacher QR flow depends on there being exactly one unambiguous open sequence.
Non-negotiable tech stack (do not substitute)
TanStack Start (file-based routing, SSR, server functions via createServerFn)
Supabase as the database + primary auth provider, connected through Lovable Cloud
Tailwind v4 + shadcn/ui ("new-york" style, already configured in components.json)
Zod for all server-function input validation
TanStack Query for client data fetching/mutations
qrcode npm package for QR generation (client-side, canvas → data URL)
Server-rendered, print-only HTML for report cards — not a third-party PDF API. This is intentional (see "Why this architecture" below). Do not replace it with Puppeteer, a PDF microservice, or a paid PDF API.
Why this architecture (context you must respect)

This is being built for real Cameroonian secondary schools, not a demo. Three facts drive every technical decision below, and you must not "improve" them away:

Connectivity is unreliable and metered. Most staff are on prepaid MTN/Orange mobile data. Every screen must work on a weak connection and must not waste data. This is why report cards are rendered once as a single self-contained HTML document and then printed with the browser's native print dialog (window.print()) — after that one fetch, generating and reprinting costs nothing and needs no connection.
Many teachers only have a phone, not a laptop, and are not comfortable creating accounts. This is why there are two separate auth systems in this app, and both must exist:
Supabase Auth (email/password + Google OAuth) for admins/principals who manage the platform.
A separate, custom, non-Supabase teacher login (login code + password, hashed with PBKDF2, session via signed httpOnly cookie) used only inside the QR marksheet flow. Teachers never see or need a Supabase account. Do not merge these two systems.
Printing happens at a print shop or cyber café, in batch, per class. The bulletin generator must render all students in a class as one document with CSS page breaks, so one "Print" click produces the whole class's stack.
Step 1 — Connect the backend
Connect Lovable Cloud (Supabase) to this project. This must provision SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY and expose VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY to the client build automatically.
Run the full SQL schema in the Appendix: Database schema section below against the new Supabase project, in order, exactly as written. Do not paraphrase or "clean up" the RLS policies — they are the entire tenant-isolation model for this app.
Confirm Row Level Security is enabled on every table listed. A user from School A must never be able to read or write School B's rows under any role.
Step 2 — Auth & OAuth
Enable Email/Password sign-in in Supabase Auth settings.
Enable the Google OAuth provider in Supabase Auth settings, and register the OAuth consent screen / client in Google Cloud Console with the redirect URI Supabase gives you (https://<project>.supabase.co/auth/v1/callback). The app calls supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth" } }) — do not hardcode a domain, it must resolve dynamically so it keeps working if the app is later moved to a custom domain.
Add a new secret: TEACHER_SESSION_SECRET — a long random string (generate one, e.g. 32+ random bytes hex-encoded). This is unrelated to Supabase; it signs the teacher session cookie for the QR marksheet flow (src/lib/teacher-auth.server.ts, 8-hour session, httpOnly, secure, sameSite: lax). The app throws on boot if this is missing — it is required, not optional.
Confirm src/integrations/lovable/index.ts (the Lovable OAuth wrapper) still exists even though auth.tsx currently calls supabase.auth.signInWithOAuth directly — keep both files; do not delete the wrapper, and do not silently switch the login button to use it unless you also update auth.tsx to match. Right now the direct Supabase call is what's live; keep it that way unless I ask otherwise.
Step 3 — Rebuild the codebase from the attached repomix

Reproduce the codebase in the attached repomix file-for-file, including:

Full route tree under src/routes/ (_authenticated/* layout + protected pages, public landing at /, public /marksheet/$token, /auth, /sitemap.xml).
All server functions in src/lib/*.functions.ts exactly as written, including the requireSupabaseAuth middleware pattern and the separate service-role admin client (client.server.ts) used only inside marksheet.functions.ts for the teacher flow.
The grading engine (src/lib/grading/index.ts) verbatim — weighted average is Σ(mark × coefficient) / Σ(coefficient) per student, per-subject class average is the simple mean of submitted marks for that subject, ranks are computed both overall and per-subject, ties are not specially handled (standard competition-free descending sort), and grade bands (Excellent/Très Bien/Bien/... for FR, A–F for EN) are configurable per school via schools.grade_bands but default to the constants in that file.
The subject presets in src/lib/defaults.ts (FR: Collège, Séries A/C/D · EN: Form general, Form science, Lower/Upper Sixth arts) — these seed realistic coefficients when a class is created and must stay editable afterward per class.
The bulletin HTML renderer (src/lib/bulletin-render.ts) verbatim — bilingual national header (République du Cameroun / Republic of Cameroon), school logo/address/motto, per-student grade table with mark/coefficient/mark×coef/class average/rank/appreciation, summary boxes (average, overall position, grade), conduct & attendance line, class-teacher/principal/council remarks, and signature blocks. Fonts are Fraunces (display) + Inter (body), loaded from Google Fonts inside the generated document itself so the printed page is self-contained.
The teacher QR flow exactly as built: class detail page has a "QR & Marksheet" tab that generates a QR encoding {origin}/marksheet/{marksheet_token}; scanning it lands on a public page that shows the open sequence, prompts teacher login (login code + password), lists only the subjects that teacher is assigned to in that specific class, and lets them enter/save marks for the currently open sequence only. Regenerating the QR must invalidate the old token.
Step 4 — Design system (do not restyle)

Reproduce the "Academic Navy" design system from src/styles.css exactly — this is a deliberate choice to look like an official ministry document, which matters for parent/principal trust:

Fonts: Fraunces (headings/display) + Inter (body), loaded via @fontsource.
Palette (oklch): background oklch(0.985 0.005 95) warm off-white, primary oklch(0.24 0.06 258) deep navy, secondary oklch(0.32 0.07 258), gold accent oklch(0.74 0.13 80) used sparingly for seals/accents, hairline borders oklch(0.88 0.01 260). Full token list is in the attached src/styles.css — use it verbatim, including the dark-mode variants and the sidebar-specific tokens.
All components must use semantic Tailwind tokens (bg-background, text-foreground, etc.), never hardcoded hex values, so theming stays consistent.
Step 5 — Route-by-route functional spec (must all be present and working)
/ — marketing landing page, bilingual copy, subsystem comparison section, bulletin preview mockup, CTA to /auth?mode=signup.
/auth — email/password sign-in and sign-up, Google OAuth button, redirects to /dashboard (or /setup if the user has no school yet).
/setup — 3-step wizard: (1) subsystem choice + school identity, (2) academic year label (auto-creates 3 terms + 6 sequences, first sequence open by default), (3) one or more classes seeded from subject presets, editable inline before submit.
/dashboard — school stats (classes, students, subjects, teachers), current open sequence, per-class mark-entry completion percentage, quick links into each class.
/classes and /classes/$classId — class list/create, and a class detail page with tabs: Subjects (CRUD + coefficient), Students (CRUD + CSV import with last_name,first_name, matricule,sex columns, header optional, 500-row cap), Teachers (assign teacher → subject for this class), QR & Marksheet (generate/download/reset QR).
/grades/$classId — spreadsheet-style grid, students × subjects, admin-facing equivalent of the teacher marksheet, sequence selector, save button, inline validation against the school's subsystem max mark.
/bulletins — pick class + sequence, click "Generate report cards," opens a new tab with the server-rendered print-ready HTML for every student in that class (falls back to a downloadable .html blob if the popup is blocked).
/staff — teacher account CRUD (full name, login code, password), password reset, active toggle. This is where teacher login codes are created — separate from Supabase users.
/settings — school logo upload (cap at 500 KB, stored as a data URL in schools.logo_url), and sequence open/close control (opening one automatically closes all others in that school).
/students — class picker into the Students tab of /classes/$classId.
/marksheet/$token — public, no Supabase auth: shows school/class/open-sequence info, teacher login form, subject picker, and a mobile-first mark-entry list with a sticky save button.
Step 6 — Mandatory hardening before this is considered "done"

These are fixes to the original build, not new features. Apply exactly these four, nothing more:

Rate-limit the teacher login server function (teacherLogin in marksheet.functions.ts). It currently has no throttling on login-code + password guesses. Add a simple in-memory or Supabase-backed counter: after 8 failed attempts for the same login_code within 15 minutes, reject further attempts for that code for 15 minutes, regardless of source IP. Return a generic error either way — do not reveal whether the login code exists.
Enforce subsystem-correct mark caps server-side. saveGrades and saveMarksheet currently validate mark <= 100 unconditionally, even for FR schools that are capped at /20. Fetch the school's subsystem inside the handler and reject marks above 20 for FR or 100 for EN, matching what the client already does — the server must not trust the client-side max.
Add visible save-retry state to the grade grid and the marksheet roster. Given real-world connectivity, a save that silently fails is the single most damaging failure mode for this product (a teacher believes marks are recorded; they are not). On save failure, keep the entered values on screen, show a persistent "Not saved — tap to retry" indicator instead of a toast that disappears, and retry automatically once with backoff before falling back to manual retry. Do not add offline queuing or a service worker — just make failure impossible to miss.
Confirm robots.txt still disallows /auth, /dashboard, /classes, /students, /bulletins, /settings, /setup exactly as in the attached file — student data must never be indexable.
Explicitly out of scope — do not add any of this

Do not introduce any of the following, even if it seems like an obvious improvement. Scope discipline matters more than feature completeness for this restoration:

Mobile Money / MTN MoMo / Orange Money billing or subscriptions of any kind.
SMS or WhatsApp notifications to parents or teachers.
A native mobile app or offline-first PWA/service worker.
Multi-school switching for a single admin account (the app currently assumes one school per admin via listMySchools()[0] — leave this as-is).
Any third-party PDF generation service — the print-based HTML renderer is final.
Real-time/live sync (e.g. Supabase Realtime channels) on the grade grid.
Step 7 — Acceptance checklist (verify every item before you tell me this is done)
 New Supabase project provisioned via Lovable Cloud; all tables + enums + RLS from the Appendix exist and RLS is enabled on every one.
 Email/password sign-up and sign-in work; Google OAuth sign-in works end-to-end.
 TEACHER_SESSION_SECRET is set; visiting any page under /marksheet/ does not throw a missing-secret error.
 Creating a school via /setup works for both subsystems and produces 3 terms + 6 sequences with only sequence #1 open.
 Creating a class seeds the correct subject preset with correct coefficients, editable after.
 CSV student import works with and without a header row.
 Creating a teacher in /staff, assigning them to a subject in a class, generating that class's QR code, scanning/opening it, logging in as that teacher, and saving marks all work — and that teacher cannot see or enter marks for a subject they aren't assigned to.
 Admin grade entry grid at /grades/$classId saves correctly and rejects out-of-range marks for the school's subsystem (test both a FR school at 21 and an EN school at 101 — both must be rejected server-side even if you bypass client validation).
 Opening a second sequence in /settings automatically closes the previously open one.
 /bulletins generates a correct print-ready document for a full class, with page breaks per student, the school's uploaded logo, and correct bilingual header.
 Two separate admin accounts on two separate schools cannot see each other's classes, students, or grades under any circumstance (manually test this, don't just trust RLS).
 robots.txt matches the attached file exactly.
Appendix: Database schema (run exactly as written, in order)
sql
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.subsystem AS ENUM ('FR', 'EN');
CREATE TYPE public.school_role AS ENUM ('admin', 'principal', 'class_teacher', 'subject_teacher');
CREATE TYPE public.student_sex AS ENUM ('M', 'F');
CREATE TYPE public.sequence_status AS ENUM ('open', 'closed');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subsystem public.subsystem NOT NULL,
  logo_url TEXT,
  address TEXT,
  motto TEXT,
  language_default TEXT NOT NULL DEFAULT 'fr',
  grade_bands JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SCHOOL MEMBERS (roles)
-- ============================================================
CREATE TABLE public.school_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.school_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_members TO authenticated;
GRANT ALL ON public.school_members TO service_role;
ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.school_members(user_id);
CREATE INDEX ON public.school_members(school_id);

-- ============================================================
-- SECURITY DEFINER HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.school_members WHERE user_id = _user_id AND school_id = _school_id);
$$;

CREATE OR REPLACE FUNCTION public.has_school_role(_user_id UUID, _school_id UUID, _roles public.school_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE user_id = _user_id AND school_id = _school_id AND role = ANY(_roles)
  );
$$;

CREATE POLICY "Members read their school" ON public.schools FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), id) OR created_by = auth.uid());
CREATE POLICY "Anyone authenticated creates a school" ON public.schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins/principals update school" ON public.schools FOR UPDATE TO authenticated
  USING (public.has_school_role(auth.uid(), id, ARRAY['admin','principal']::public.school_role[]));
CREATE POLICY "Admins delete school" ON public.schools FOR DELETE TO authenticated
  USING (public.has_school_role(auth.uid(), id, ARRAY['admin']::public.school_role[]));

CREATE POLICY "Read own memberships" ON public.school_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin inserts members" ON public.school_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_school_role(auth.uid(), school_id, ARRAY['admin']::public.school_role[])
    OR (user_id = auth.uid() AND role = 'admin'::public.school_role
        AND EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND s.created_by = auth.uid()))
  );
CREATE POLICY "Admin updates members" ON public.school_members FOR UPDATE TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin']::public.school_role[]));
CREATE POLICY "Admin removes members" ON public.school_members FOR DELETE TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin']::public.school_role[]));

-- ============================================================
-- ACADEMIC YEARS & TERMS
-- ============================================================
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_years TO authenticated;
GRANT ALL ON public.academic_years TO service_role;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read years" ON public.academic_years FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write years" ON public.academic_years FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

CREATE TABLE public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  index INTEGER NOT NULL CHECK (index BETWEEN 1 AND 3),
  name TEXT NOT NULL,
  UNIQUE (academic_year_id, index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read terms" ON public.terms FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write terms" ON public.terms FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- SEQUENCES
-- ============================================================
CREATE TABLE public.sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  index INTEGER NOT NULL CHECK (index BETWEEN 1 AND 6),
  name TEXT NOT NULL,
  status public.sequence_status NOT NULL DEFAULT 'closed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequences TO authenticated;
GRANT ALL ON public.sequences TO service_role;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.sequences(school_id);
CREATE INDEX ON public.sequences(term_id);
CREATE POLICY "Members read sequences" ON public.sequences FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write sequences" ON public.sequences FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- CLASSES
-- ============================================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  level TEXT NOT NULL,
  stream TEXT,
  name TEXT NOT NULL,
  class_teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  marksheet_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marksheet_token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read classes" ON public.classes FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write classes" ON public.classes FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  coefficient NUMERIC(5,2) NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.subjects(class_id);
CREATE POLICY "Members read subjects" ON public.subjects FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  matricule TEXT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  sex public.student_sex,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.students(class_id);
CREATE POLICY "Members read students" ON public.students FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal/class_teacher write students" ON public.students FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]));

-- ============================================================
-- TEACHERS (not Supabase auth users)
-- ============================================================
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  login_code TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, login_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.teachers(school_id);
CREATE POLICY "Members read teachers" ON public.teachers FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- TEACHER ASSIGNMENTS
-- ============================================================
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.teacher_assignments(teacher_id);
CREATE INDEX ON public.teacher_assignments(class_id);
CREATE POLICY "Members read teacher assignments" ON public.teacher_assignments FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write teacher assignments" ON public.teacher_assignments FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- GRADES
-- ============================================================
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  mark NUMERIC(6,2),
  remark TEXT,
  entered_by_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, sequence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.grades(sequence_id);
CREATE INDEX ON public.grades(student_id);
CREATE INDEX ON public.grades(subject_id);
CREATE POLICY "Members read grades" ON public.grades FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admins/principals/class_teachers write grades" ON public.grades FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]));

-- ============================================================
-- CONDUCT & ATTENDANCE
-- ============================================================
CREATE TABLE public.conduct_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  conduct TEXT,
  absences_justified INTEGER NOT NULL DEFAULT 0,
  absences_unjustified INTEGER NOT NULL DEFAULT 0,
  days_present INTEGER,
  days_absent INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, sequence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conduct_attendance TO authenticated;
GRANT ALL ON public.conduct_attendance TO service_role;
ALTER TABLE public.conduct_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read conduct" ON public.conduct_attendance FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal/class_teacher write conduct" ON public.conduct_attendance FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]));

-- ============================================================
-- REMARKS
-- ============================================================
CREATE TABLE public.remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  class_teacher_remark TEXT,
  principal_remark TEXT,
  council_decision TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, sequence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remarks TO authenticated;
GRANT ALL ON public.remarks TO service_role;
ALTER TABLE public.remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read remarks" ON public.remarks FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal/class_teacher write remarks" ON public.remarks FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal','class_teacher']::public.school_role[]));

-- ============================================================
-- TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER tr_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tr_schools_touch  BEFORE UPDATE ON public.schools  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tr_grades_touch   BEFORE UPDATE ON public.grades   FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tr_conduct_touch  BEFORE UPDATE ON public.conduct_attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tr_remarks_touch  BEFORE UPDATE ON public.remarks  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- AUTO-PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION GRANTS
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.is_school_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_school_role(UUID, UUID, public.school_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_school_role(UUID, UUID, public.school_role[]) TO authenticated;
Appendix: Required secrets / environment variables
Name	Source	Notes
SUPABASE_URL	Auto (Lovable Cloud)	Server-side
SUPABASE_PUBLISHABLE_KEY	Auto (Lovable Cloud)	Server-side
SUPABASE_SERVICE_ROLE_KEY	Auto (Lovable Cloud)	Server-only, used solely in client.server.ts
VITE_SUPABASE_URL	Auto (Lovable Cloud)	Client-side
VITE_SUPABASE_PUBLISHABLE_KEY	Auto (Lovable Cloud)	Client-side
TEACHER_SESSION_SECRET	You must add manually	32+ random bytes, e.g. openssl rand -hex 32

***************IMPORTANT****************

YOU SHOULD IMPLEMENT THE GOOGLE AUTH YOURSELF AND MAKE IT READY. IN FACT THE APP SHOULD BE READY FOR PRODUCTION

***************IMPORTANT*****************

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ebulletin.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f562b776-147c-45be-b9c9-b55a2d7eb59e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
