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
  USING (public.is_school_member(auth.uid(), id));
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
-- SEQUENCES (evaluation periods inside terms; admin opens/closes)
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
-- TEACHERS (lightweight, name + login + password; not app users)
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
-- Members can read teacher names/login codes (NOT exposing hash to client is handled in server fns)
CREATE POLICY "Members read teachers" ON public.teachers FOR SELECT TO authenticated
  USING (public.is_school_member(auth.uid(), school_id));
CREATE POLICY "Admin/principal write teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]))
  WITH CHECK (public.has_school_role(auth.uid(), school_id, ARRAY['admin','principal']::public.school_role[]));

-- ============================================================
-- TEACHER ASSIGNMENTS (teacher x class x subject)
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
-- GRADES (per student x subject x sequence)
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
-- CONDUCT & ATTENDANCE (per student x sequence)
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
-- REMARKS (per student x sequence)
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
