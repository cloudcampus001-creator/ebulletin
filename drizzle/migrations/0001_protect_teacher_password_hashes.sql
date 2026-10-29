REVOKE SELECT ON public.teachers FROM authenticated, anon;
GRANT SELECT (id, school_id, full_name, login_code, active, created_at) ON public.teachers TO authenticated;