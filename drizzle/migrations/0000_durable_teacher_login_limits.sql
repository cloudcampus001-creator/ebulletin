CREATE TABLE public.teacher_login_limits (
 school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
 login_code text NOT NULL,
 failures integer NOT NULL DEFAULT 0,
 first_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz,
 PRIMARY KEY (school_id, login_code)
);
GRANT ALL ON public.teacher_login_limits TO service_role;
ALTER TABLE public.teacher_login_limits ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.record_teacher_login_failure(p_school_id uuid, p_login_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.teacher_login_limits AS limits (school_id, login_code, failures, first_at)
 VALUES (p_school_id, lower(trim(p_login_code)), 1, now())
 ON CONFLICT (school_id, login_code) DO UPDATE SET
 failures = CASE WHEN limits.first_at < now() - interval '15 minutes' AND (limits.locked_until IS NULL OR limits.locked_until <= now()) THEN 1 ELSE limits.failures + 1 END,
 first_at = CASE WHEN limits.first_at < now() - interval '15 minutes' AND (limits.locked_until IS NULL OR limits.locked_until <= now()) THEN now() ELSE limits.first_at END,
 locked_until = CASE WHEN limits.locked_until > now() THEN limits.locked_until WHEN limits.first_at < now() - interval '15 minutes' THEN NULL WHEN limits.failures + 1 >= 8 THEN now() + interval '15 minutes' ELSE NULL END;
END;
$$;
REVOKE ALL ON FUNCTION public.record_teacher_login_failure(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_teacher_login_failure(uuid, text) TO service_role;