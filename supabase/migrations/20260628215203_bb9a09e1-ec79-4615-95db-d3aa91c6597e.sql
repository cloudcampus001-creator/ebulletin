DROP POLICY IF EXISTS "Members read their school" ON public.schools;

CREATE POLICY "Members read their school"
ON public.schools
FOR SELECT
TO authenticated
USING (
  is_school_member(auth.uid(), id)
  OR created_by = auth.uid()
);
